"""Training loop for LoRA fine-tuning with checkpoint callbacks.

Provides a self-contained training loop using PyTorch and the HuggingFace
tokenizer directly (no Trainer dependency), so we can hook checkpoint saving
for TracIn influence computation.

Backend-agnostic -- no Modal or RunPod imports.
"""

from __future__ import annotations

import math
from typing import Any, Callable, Optional

import torch
from torch.optim import AdamW
from torch.utils.data import DataLoader, Dataset
from transformers import PreTrainedModel, PreTrainedTokenizerBase, get_linear_schedule_with_warmup

from core.schemas import Hyperparams, QAPair


# ---------------------------------------------------------------------------
# Dataset
# ---------------------------------------------------------------------------

class QADataset(Dataset):
    """Simple map-style dataset of tokenised QA pairs."""

    def __init__(
        self,
        examples: list[dict[str, Any]],
        tokenizer: PreTrainedTokenizerBase,
        max_seq_length: int,
    ) -> None:
        self.encodings: list[dict[str, torch.Tensor]] = []
        for ex in examples:
            prompt = _format_qa(ex["question"], ex["answer"])
            enc = tokenizer(
                prompt,
                max_length=max_seq_length,
                truncation=True,
                padding="max_length",
                return_tensors="pt",
            )
            input_ids = enc["input_ids"].squeeze(0)
            attention_mask = enc["attention_mask"].squeeze(0)
            labels = input_ids.clone()
            # Mask padding tokens in labels so they are ignored by loss
            labels[attention_mask == 0] = -100
            self.encodings.append(
                {
                    "input_ids": input_ids,
                    "attention_mask": attention_mask,
                    "labels": labels,
                }
            )

    def __len__(self) -> int:
        return len(self.encodings)

    def __getitem__(self, idx: int) -> dict[str, torch.Tensor]:
        return self.encodings[idx]


def _format_qa(question: str, answer: str) -> str:
    """Format a single QA pair as an instruction-style prompt."""
    return (
        f"### Question:\n{question}\n\n"
        f"### Answer:\n{answer}"
    )


def prepare_dataset(
    training_data: list[QAPair] | list[dict[str, Any]],
    tokenizer: PreTrainedTokenizerBase,
    max_seq_length: int,
) -> QADataset:
    """Build a :class:`QADataset` from raw QA pair dicts."""
    # Accept both Pydantic models and plain dicts
    examples: list[dict[str, Any]] = []
    for item in training_data:
        if hasattr(item, "model_dump"):
            examples.append(item.model_dump())  # type: ignore[union-attr]
        elif isinstance(item, dict):
            examples.append(item)
        else:
            raise TypeError(f"Unexpected type for training item: {type(item)}")
    return QADataset(examples, tokenizer, max_seq_length)


# ---------------------------------------------------------------------------
# Training loop
# ---------------------------------------------------------------------------

def train_loop(
    model: PreTrainedModel,
    tokenizer: PreTrainedTokenizerBase,
    dataset: QADataset,
    hyperparams: Hyperparams | dict[str, Any],
    checkpoint_callback: Optional[Callable[[PreTrainedModel, int, float], None]] = None,
    progress_callback: Optional[Callable[[int, int, float], None]] = None,
) -> tuple[PreTrainedModel, list[float]]:
    """Run the full training loop.

    Parameters
    ----------
    model:
        A PEFT-wrapped causal-LM.
    tokenizer:
        Matching tokenizer (used only for saving checkpoints).
    dataset:
        Tokenised training dataset.
    hyperparams:
        Training hyperparameters.
    checkpoint_callback:
        ``(model, epoch, loss)`` called every ``checkpoint_interval`` epochs.
        Used by TracIn to snapshot adapter weights.
    progress_callback:
        ``(current_epoch, total_epochs, loss)`` called after every epoch.

    Returns
    -------
    tuple
        ``(model, loss_history)`` where *loss_history* is per-epoch mean loss.
    """
    if isinstance(hyperparams, dict):
        hp = Hyperparams(**hyperparams)
    else:
        hp = hyperparams

    dataloader = DataLoader(
        dataset,
        batch_size=hp.batch_size,
        shuffle=True,
        drop_last=False,
    )

    # Optimiser (only trainable / LoRA params)
    trainable_params = [p for p in model.parameters() if p.requires_grad]
    optimizer = AdamW(
        trainable_params,
        lr=hp.learning_rate,
        weight_decay=hp.weight_decay,
    )

    total_steps = hp.num_epochs * math.ceil(len(dataset) / hp.batch_size)
    warmup_steps = int(total_steps * hp.warmup_ratio)
    scheduler = get_linear_schedule_with_warmup(
        optimizer,
        num_warmup_steps=warmup_steps,
        num_training_steps=total_steps,
    )

    device = next(model.parameters()).device
    model.train()
    loss_history: list[float] = []

    for epoch in range(1, hp.num_epochs + 1):
        epoch_loss = 0.0
        num_batches = 0

        for batch in dataloader:
            input_ids = batch["input_ids"].to(device)
            attention_mask = batch["attention_mask"].to(device)
            labels = batch["labels"].to(device)

            outputs = model(
                input_ids=input_ids,
                attention_mask=attention_mask,
                labels=labels,
            )
            loss = outputs.loss
            loss.backward()

            torch.nn.utils.clip_grad_norm_(trainable_params, max_norm=1.0)
            optimizer.step()
            scheduler.step()
            optimizer.zero_grad()

            epoch_loss += loss.item()
            num_batches += 1

        mean_loss = epoch_loss / max(num_batches, 1)
        loss_history.append(mean_loss)

        if progress_callback is not None:
            progress_callback(epoch, hp.num_epochs, mean_loss)

        if checkpoint_callback is not None and epoch % 10 == 0:
            checkpoint_callback(model, epoch, mean_loss)

    return model, loss_history
