"""RunPod serverless handler for the Influence Dashboard.

This handler implements the same training + influence + evaluation pipeline
as the Modal backend, but runs as a RunPod serverless worker.  It uses a
generator-based handler to yield progress updates during execution.

The job input schema matches ``core.schemas.TrainRequest``.
"""

from __future__ import annotations

import time
import traceback
from typing import Any, Generator

import runpod
import torch

from core.schemas import TrainRequest
from core.models import load_model_and_tokenizer, setup_lora
from core.train import prepare_dataset, train_loop
from core.influence import compute_tracin, compute_datainf, compute_kronfluence
from core.inference import run_eval


def handler(job: dict[str, Any]) -> Generator[dict[str, Any], None, dict[str, Any]]:
    """RunPod serverless handler -- generator that yields progress updates.

    Parameters
    ----------
    job:
        RunPod job dict with ``job["input"]`` containing the training request
        payload matching ``TrainRequest``.

    Yields
    ------
    dict
        Progress updates with ``status``, ``progress``, and contextual fields.

    Returns
    -------
    dict
        Final results payload matching ``ResultsResponse`` structure, or an
        error dict on failure.
    """
    job_input = job["input"]
    start_time = time.time()

    # ------------------------------------------------------------------
    # Parse request
    # ------------------------------------------------------------------
    try:
        req = TrainRequest(**job_input)
    except Exception as e:
        return {
            "error": f"Invalid request: {e}",
            "suggestion": "Check the request payload matches the TrainRequest schema.",
        }

    total_epochs = req.hyperparams.num_epochs

    yield {
        "status": "starting",
        "progress": 0.0,
        "current_epoch": 0,
        "total_epochs": total_epochs,
    }

    try:
        # --------------------------------------------------------------
        # 1. Load model
        # --------------------------------------------------------------
        model, tokenizer = load_model_and_tokenizer(
            req.model_id,
            quantization=req.hyperparams.quantization,
            hf_token=req.hf_token,
        )

        # --------------------------------------------------------------
        # 2. Apply LoRA
        # --------------------------------------------------------------
        model = setup_lora(
            model,
            lora_rank=req.hyperparams.lora_rank,
            lora_alpha=req.hyperparams.lora_alpha,
            target_modules=req.hyperparams.lora_target_modules,
        )

        # --------------------------------------------------------------
        # 3. Prepare dataset and train
        # --------------------------------------------------------------
        training_dicts = [td.model_dump() for td in req.training_data]
        eval_dicts = [ed.model_dump() for ed in req.eval_data]

        dataset = prepare_dataset(
            training_dicts, tokenizer, req.hyperparams.max_seq_length
        )

        # Checkpoint storage for TracIn
        checkpoints: list[dict[str, torch.Tensor]] = []
        checkpoint_lrs: list[float] = []

        # We collect progress updates from the training loop via a list
        # that the callback appends to; the generator yields them after
        # the training loop completes each epoch.
        _pending_progress: list[dict[str, Any]] = []

        def checkpoint_callback(
            mdl: Any, epoch: int, loss: float
        ) -> None:
            """Save LoRA state dict at checkpoint intervals for TracIn."""
            state = {
                k: v.clone().cpu()
                for k, v in mdl.state_dict().items()
                if "lora" in k.lower()
            }
            checkpoints.append(state)
            # Approximate the learning rate at this checkpoint
            frac = epoch / total_epochs
            if frac < req.hyperparams.warmup_ratio:
                lr = req.hyperparams.learning_rate * (
                    frac / req.hyperparams.warmup_ratio
                )
            else:
                lr = req.hyperparams.learning_rate * (
                    1
                    - (frac - req.hyperparams.warmup_ratio)
                    / (1 - req.hyperparams.warmup_ratio)
                )
            checkpoint_lrs.append(max(lr, 0.0))

        def progress_callback(epoch: int, total: int, loss: float) -> None:
            """Collect progress updates from the training loop."""
            elapsed = time.time() - start_time
            frac = epoch / total
            eta = (
                (elapsed / max(frac, 1e-9)) * (1 - frac) if frac > 0 else 0
            )
            _pending_progress.append({
                "status": "training",
                "progress": round(frac * 0.6, 4),
                "current_epoch": epoch,
                "total_epochs": total,
                "training_loss": round(loss, 6),
                "eta_seconds": round(eta, 1),
            })

        # --- Run training ---
        # NOTE: Because train_loop is synchronous we cannot yield inside
        # the callback.  Instead we yield an initial training status,
        # run the loop, and then yield the final training progress.
        yield {
            "status": "training",
            "progress": 0.05,
            "current_epoch": 0,
            "total_epochs": total_epochs,
        }

        model, loss_history = train_loop(
            model,
            tokenizer,
            dataset,
            req.hyperparams,
            checkpoint_callback=(
                checkpoint_callback if req.influence_method == "tracin" else None
            ),
            progress_callback=progress_callback,
        )

        training_time = time.time() - start_time

        # Yield the last collected training progress (most up-to-date)
        if _pending_progress:
            yield _pending_progress[-1]

        # --------------------------------------------------------------
        # 4. Compute influence scores
        # --------------------------------------------------------------
        yield {
            "status": "computing_influence",
            "progress": 0.65,
        }

        influence_start = time.time()

        if req.influence_method == "tracin":
            if not checkpoints:
                final_state = {
                    k: v.clone().cpu()
                    for k, v in model.state_dict().items()
                    if "lora" in k.lower()
                }
                checkpoints.append(final_state)
                checkpoint_lrs.append(req.hyperparams.learning_rate)
            influence_matrix = compute_tracin(
                model, tokenizer, training_dicts, eval_dicts,
                checkpoints, checkpoint_lrs,
            )
        elif req.influence_method == "datainf":
            influence_matrix = compute_datainf(
                model, tokenizer, training_dicts, eval_dicts,
            )
        elif req.influence_method == "kronfluence":
            influence_matrix = compute_kronfluence(
                model, tokenizer, training_dicts, eval_dicts,
            )
        else:
            return {
                "error": f"Unknown influence method: {req.influence_method}",
                "suggestion": "Supported methods: tracin, datainf, kronfluence.",
            }

        influence_time = time.time() - influence_start

        yield {
            "status": "computing_influence",
            "progress": 0.85,
        }

        # --------------------------------------------------------------
        # 5. Run evaluation (base / few-shot / fine-tuned)
        # --------------------------------------------------------------
        yield {
            "status": "running_eval",
            "progress": 0.9,
        }

        eval_results = run_eval(
            base_model=model,
            finetuned_model=model,
            tokenizer=tokenizer,
            training_data=training_dicts,
            eval_data=eval_dicts,
        )

        # --------------------------------------------------------------
        # 6. Collect GPU memory stats
        # --------------------------------------------------------------
        peak_mem_gb = 0.0
        if torch.cuda.is_available():
            peak_mem_gb = torch.cuda.max_memory_allocated() / (1024 ** 3)

        # --------------------------------------------------------------
        # 7. Assemble final results
        # --------------------------------------------------------------
        total_time = time.time() - start_time
        results_payload: dict[str, Any] = {
            "job_id": req.job_id,
            "status": "completed",
            "eval_results": eval_results,
            "influence": influence_matrix,
            "training_metadata": {
                "total_training_time_seconds": round(training_time, 2),
                "total_influence_time_seconds": round(influence_time, 2),
                "peak_gpu_memory_gb": round(peak_mem_gb, 2),
                "final_training_loss": (
                    loss_history[-1] if loss_history else 0.0
                ),
                "loss_history": loss_history,
            },
        }

        return results_payload

    except torch.cuda.OutOfMemoryError:
        traceback.print_exc()
        return {
            "error": "GPU out of memory",
            "suggestion": (
                "Try reducing batch_size, max_seq_length, or lora_rank. "
                "You can also switch to 4-bit quantization or use a smaller model."
            ),
        }

    except Exception as e:
        traceback.print_exc()
        return {
            "error": str(e),
            "suggestion": (
                "Check the logs for details. The error traceback is printed above."
            ),
        }


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

runpod.serverless.start({"handler": handler, "return_aggregate_stream": True})
