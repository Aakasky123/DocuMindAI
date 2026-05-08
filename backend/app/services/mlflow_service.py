from app.core.config import get_settings


class MLflowService:
    def log_evaluation(self, run_name: str, params: dict, metrics: dict) -> None:
        settings = get_settings()
        try:
            import mlflow

            mlflow.set_tracking_uri(settings.mlflow_tracking_uri)
            with mlflow.start_run(run_name=run_name):
                mlflow.log_params(params)
                mlflow.log_metrics(metrics)
        except Exception:
            return
