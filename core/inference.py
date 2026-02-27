"""Inference utilities for base, few-shot, and fine-tuned model evaluation.

Provides generation helpers and the ``run_eval`` function that produces
side-by-side comparisons used by the dashboard's results panel.

Backend-agnostic -- no Modal or RunPod imports.
"""

from __future__ import annotations

from typing import Any

import torch
from peft import PeftModel
from transformers import PreTrainedModel, PreTrainedTokenizerBase


# ---------------------------------------------------------------------------
# Generation
# ---------------------------------------------------------------------------

def generate_response(
    model: PreTrainedModel,
    tokenizer: PreTrainedTokenizerBase,
    question: str,
    max_new_tokens: int = 256,
) -> str:
    """Generate a single response from *model* given *question*.

    Uses greedy decoding with temperature 0 for reproducibility.
    """
    prompt = f"### Question:\n{question}\n\n### Answer:\n"
    device = next(model.parameters()).device

    inputs = tokenizer(prompt, return_tensors="pt", truncation=True, max_length=512).to(device)
    model.eval()

    with torch.no_grad():
        output_ids = model.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            do_sample=False,
            temperature=1.0,  # ignored when do_sample=False, but explicit
            pad_token_id=tokenizer.pad_token_id,
            eos_token_id=tokenizer.eos_token_id,
        )

    # Decode only the newly generated tokens
    prompt_len = inputs["input_ids"].shape[1]
    generated_ids = output_ids[0, prompt_len:]
    response = tokenizer.decode(generated_ids, skip_special_tokens=True).strip()
    return response


# ---------------------------------------------------------------------------
# Few-shot prompt
# ---------------------------------------------------------------------------

def build_fewshot_prompt(
    training_data: list[dict[str, Any]],
    eval_question: str,
    num_shots: int = 3,
) -> str:
    """Build a few-shot prompt using the first *num_shots* training examples.

    The prompt ends with the eval question so the model can generate the
    answer directly.
    """
    shots = training_data[:num_shots]
    parts: list[str] = []

    for shot in shots:
        parts.append(
            f"### Question:\n{shot['question']}\n\n"
            f"### Answer:\n{shot['answer']}"
        )

    parts.append(
        f"### Question:\n{eval_question}\n\n"
        f"### Answer:\n"
    )

    return "\n\n---\n\n".join(parts)


def _generate_fewshot(
    model: PreTrainedModel,
    tokenizer: PreTrainedTokenizerBase,
    training_data: list[dict[str, Any]],
    eval_question: str,
    max_new_tokens: int = 256,
    num_shots: int = 3,
) -> str:
    """Generate a response using a few-shot prompt."""
    prompt = build_fewshot_prompt(training_data, eval_question, num_shots=num_shots)
    device = next(model.parameters()).device

    inputs = tokenizer(
        prompt,
        return_tensors="pt",
        truncation=True,
        max_length=1024,
    ).to(device)

    model.eval()
    with torch.no_grad():
        output_ids = model.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            do_sample=False,
            pad_token_id=tokenizer.pad_token_id,
            eos_token_id=tokenizer.eos_token_id,
        )

    prompt_len = inputs["input_ids"].shape[1]
    generated_ids = output_ids[0, prompt_len:]
    return tokenizer.decode(generated_ids, skip_special_tokens=True).strip()


# ---------------------------------------------------------------------------
# Full evaluation
# ---------------------------------------------------------------------------

def run_eval(
    base_model: PreTrainedModel,
    finetuned_model: PreTrainedModel,
    tokenizer: PreTrainedTokenizerBase,
    training_data: list[dict[str, Any]],
    eval_data: list[dict[str, Any]],
    max_new_tokens: int = 256,
    num_shots: int = 3,
) -> list[dict[str, str]]:
    """Run base, few-shot, and fine-tuned inference on all eval questions.

    Parameters
    ----------
    base_model:
        The original model without LoRA adapters (or with adapters disabled).
    finetuned_model:
        The model with trained LoRA adapters.
    training_data:
        Training QA pairs (used for few-shot prompt construction).
    eval_data:
        Evaluation questions.

    Returns
    -------
    list[dict]
        List of ``EvalResult`` dicts with keys:
        ``eval_question``, ``base_output``, ``fewshot_output``,
        ``finetuned_output``.
    """
    results: list[dict[str, str]] = []

    for ed in eval_data:
        question = ed["question"]

        # Base model output (disable adapters if PEFT model)
        if isinstance(base_model, PeftModel):
            with base_model.disable_adapter():
                base_output = generate_response(
                    base_model, tokenizer, question, max_new_tokens
                )
        else:
            base_output = generate_response(
                base_model, tokenizer, question, max_new_tokens
            )

        # Few-shot output (using base model without adapters)
        if isinstance(base_model, PeftModel):
            with base_model.disable_adapter():
                fewshot_output = _generate_fewshot(
                    base_model, tokenizer, training_data, question,
                    max_new_tokens, num_shots,
                )
        else:
            fewshot_output = _generate_fewshot(
                base_model, tokenizer, training_data, question,
                max_new_tokens, num_shots,
            )

        # Fine-tuned model output
        finetuned_output = generate_response(
            finetuned_model, tokenizer, question, max_new_tokens
        )

        results.append({
            "eval_question": question,
            "base_output": base_output,
            "fewshot_output": fewshot_output,
            "finetuned_output": finetuned_output,
        })

    return results
