"""Model loading utilities for fine-tuning and inference.

Handles HuggingFace model downloads, quantisation via bitsandbytes,
and PEFT/LoRA adapter setup.  Backend-agnostic -- no Modal or RunPod
imports.
"""

from __future__ import annotations

import re
from typing import Literal, Optional

import torch
from peft import LoraConfig, TaskType, get_peft_model
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    PreTrainedModel,
    PreTrainedTokenizerBase,
)


# ---------------------------------------------------------------------------
# Parameter count estimation
# ---------------------------------------------------------------------------

def estimate_param_count(model_id: str) -> float:
    """Rough parameter count (in billions) inferred from *model_id*.

    Falls back to 7.0B when the name doesn't contain an obvious size hint.
    """
    # Match patterns like "7b", "70b", "1.5b", "12b", "3b-instruct"
    match = re.search(r"(\d+(?:\.\d+)?)\s*[bB]", model_id)
    if match:
        return float(match.group(1))
    # Common special-case model names without a "b" suffix
    lower = model_id.lower()
    if "mini" in lower:
        return 1.0
    if "small" in lower:
        return 3.0
    return 7.0  # safe default


# ---------------------------------------------------------------------------
# Model + tokenizer loading
# ---------------------------------------------------------------------------

def load_model_and_tokenizer(
    model_id: str,
    quantization: Literal["4bit", "8bit", "none"] = "4bit",
    device_map: str = "auto",
) -> tuple[PreTrainedModel, PreTrainedTokenizerBase]:
    """Download and load an HF causal-LM with optional quantisation.

    Returns ``(model, tokenizer)`` ready for LoRA adapter attachment.
    """
    tokenizer = AutoTokenizer.from_pretrained(model_id, trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
        tokenizer.pad_token_id = tokenizer.eos_token_id

    kwargs: dict = {
        "device_map": device_map,
        "trust_remote_code": True,
        "torch_dtype": torch.bfloat16,
    }

    if quantization == "4bit":
        kwargs["quantization_config"] = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_compute_dtype=torch.bfloat16,
            bnb_4bit_use_double_quant=True,
            bnb_4bit_quant_type="nf4",
        )
    elif quantization == "8bit":
        kwargs["quantization_config"] = BitsAndBytesConfig(
            load_in_8bit=True,
        )

    model = AutoModelForCausalLM.from_pretrained(model_id, **kwargs)
    model.config.use_cache = False  # Required for gradient checkpointing

    return model, tokenizer


# ---------------------------------------------------------------------------
# LoRA setup
# ---------------------------------------------------------------------------

def setup_lora(
    model: PreTrainedModel,
    lora_rank: int = 16,
    lora_alpha: int = 32,
    target_modules: Optional[list[str]] = None,
) -> PreTrainedModel:
    """Wrap *model* with a PEFT LoRA adapter and return the peft model."""
    if target_modules is None:
        target_modules = ["q_proj", "v_proj"]

    config = LoraConfig(
        task_type=TaskType.CAUSAL_LM,
        r=lora_rank,
        lora_alpha=lora_alpha,
        lora_dropout=0.05,
        target_modules=target_modules,
        bias="none",
    )
    peft_model = get_peft_model(model, config)
    peft_model.print_trainable_parameters()
    return peft_model
