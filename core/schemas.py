"""Pydantic models for API contracts.

These mirror the TypeScript types in src/lib/types.ts and are shared
across all backend implementations (Modal, RunPod, etc.).
"""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Request / sub-models
# ---------------------------------------------------------------------------

class QAPair(BaseModel):
    id: str
    question: str
    answer: str


class EvalQuestion(BaseModel):
    id: str
    question: str


class Hyperparams(BaseModel):
    learning_rate: float = 2e-5
    num_epochs: int = 50
    batch_size: int = 4
    lora_rank: int = 16
    lora_alpha: int = 32
    lora_target_modules: list[str] = Field(default_factory=lambda: ["q_proj", "v_proj"])
    quantization: Literal["4bit", "8bit", "none"] = "4bit"
    max_seq_length: int = 512
    warmup_ratio: float = 0.1
    weight_decay: float = 0.01


class TrainRequest(BaseModel):
    job_id: str
    model_id: str
    training_data: list[QAPair]
    hyperparams: Hyperparams
    influence_method: Literal["tracin", "datainf", "kronfluence"]
    eval_data: list[EvalQuestion]
    checkpoint_interval: int = 10
    callback_url: str
    hf_token: Optional[str] = None


# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------

class TrainResponse(BaseModel):
    job_id: str
    status: str


class StatusResponse(BaseModel):
    status: str
    progress: float
    current_epoch: int
    total_epochs: int
    training_loss: float
    eta_seconds: float


class EvalResult(BaseModel):
    eval_question: str
    base_output: str
    fewshot_output: str
    finetuned_output: str


class InfluenceMatrix(BaseModel):
    training_labels: list[str]
    eval_labels: list[str]
    scores: list[list[float]]


class TrainingMetadata(BaseModel):
    total_training_time_seconds: float
    total_influence_time_seconds: float
    peak_gpu_memory_gb: float
    final_training_loss: float
    loss_history: list[float]


class ResultsResponse(BaseModel):
    eval_results: list[EvalResult]
    influence: InfluenceMatrix
    training_metadata: TrainingMetadata


class ErrorResponse(BaseModel):
    error: str
    suggestion: Optional[str] = None
