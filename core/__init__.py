"""Core ML logic shared by Modal and RunPod backends.

This package contains backend-agnostic implementations of:

* Training (LoRA fine-tuning loop)
* Influence function computation (TracIn, DataInf, Kronfluence)
* Inference (base, few-shot, fine-tuned evaluation)
* Model loading and LoRA setup
* Pydantic schemas for API contracts
"""
