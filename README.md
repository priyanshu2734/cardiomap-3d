# CardioMap 3D 🫀

**An AI-powered coronary artery disease research platform with interactive 3D heart visualization, vessel-level risk prediction, and explainable AI.**

[**🚀 Live Demo**](https://cardiomap-3d.onrender.com/app) · [API Documentation](https://cardiomap-3d.onrender.com/docs) · [GitHub Repository](https://github.com/priyanshu2734/cardiomap-3d) · [Backend Health Check](https://cardiomap-3d.onrender.com/health)

---

## Overview

CardioMap 3D is a machine-learning-powered research and educational application designed to explore coronary artery disease (CAD) and vessel-level stenosis prediction.

The platform combines clinical data analysis, machine learning, explainable AI, and interactive 3D visualization to help users understand model predictions and explore the factors that influence them.

Instead of presenting predictions as unexplained numbers, CardioMap connects model outputs with feature-level explanations, vessel visualization, and research tools.

> **Disclaimer:** CardioMap 3D is a research and educational prototype. It is not a medical device, does not provide a clinical diagnosis, and must not be used to make treatment decisions.

## Live Application

| Resource | Link |
|---|---|
| Web Application | [Open CardioMap 3D](https://cardiomap-3d.onrender.com/app) |
| API Documentation | [Swagger UI](https://cardiomap-3d.onrender.com/docs) |
| Backend Health | [Health Endpoint](https://cardiomap-3d.onrender.com/health) |
| OpenAPI Schema | [API Schema](https://cardiomap-3d.onrender.com/openapi.json) |
| Source Code | [GitHub Repository](https://github.com/priyanshu2734/cardiomap-3d) |

*Note: The first request may take longer if the free hosting instance has been idle.*

## Features

### 🫀 Interactive 3D Heart Visualization
- Explore a 3D heart visualization and coronary vessel paths.
- View LAD, LCX, and RCA vessel-level prediction outputs.
- Use vessel colors to explore predicted risk levels.
- Rotate and zoom the visualization to inspect the anatomy representation.

### 🤖 Machine Learning Predictions
- Predict overall coronary artery disease (CAD) and vessel-level stenosis.
- Support four prediction targets: CAD, LAD, LCX, and RCA.
- Compare Logistic Regression, Random Forest, and Gradient Boosting models during training.
- Use preprocessing pipelines for missing-value imputation and feature scaling.

### 🔍 Explainable AI
- Use SHAP-based explanations to explore the features influencing individual predictions.
- Inspect global feature importance.
- Connect model outputs with more interpretable explanations instead of relying only on prediction scores.

### 🧪 Research and Experimentation
- Explore model validation and performance metrics.
- Investigate how different feature groups and algorithms affect predictive performance.
- Examine calibration, subgroup results, and limitations through research-oriented tools.

### 🛡️ Trust, Audit, and Reproducibility
- Explore model trust and audit information.
- Inspect provenance and supporting evidence features.
- Use stress-testing, case-replay, and what-if exploration tools to investigate model behavior.

### 📊 Additional Tools
- AI assistant and chat interface.
- Research report generation.
- Next-best-test ranking prototype.
- Prediction history and case exploration tools.

Feature availability may depend on the deployed version and the availability of the required model artifacts or external services.

## Technology Stack

| Component | Technologies |
|---|---|
| Backend | Python, FastAPI |
| Machine Learning | scikit-learn |
| Model Serialization | Joblib |
| Data Processing | NumPy, Pandas |
| Explainable AI | SHAP |
| API Validation | Pydantic |
| API Server | Uvicorn |
| Interactive Frontend | HTML, CSS, JavaScript |
| Visualization | Interactive 3D visualization |
| Reporting | ReportLab |
| Deployment | Render |

## Machine Learning Approach

The project uses the Z-Alizadeh Sani coronary artery disease dataset, containing 303 patient records.

The model pipeline explores three classification algorithms:

- Logistic Regression
- Random Forest
- Gradient Boosting

Model selection is based on ROC-AUC during the training and validation process. Preprocessing is performed within machine-learning pipelines to help prevent information leakage during cross-validation.

The application supports four prediction targets:

| Target | Description |
|---|---|
| CAD | Overall coronary artery disease |
| LAD | Left Anterior Descending artery |
| LCX | Left Circumflex artery |
| RCA | Right Coronary Artery |

The dataset labels define CAD using the catheterization label and vessel stenosis using the dataset's stenosis labels.

**Important limitations:** The dataset is small and comes from a single cohort. Vessel-level performance varies, and the project has not established external clinical validation. Model scores should not be interpreted as confirmed clinical probabilities.

## Project Structure

```text
cardiomap-3d/
├── static/                 # Frontend assets and visualization resources
├── docs/                   # Project documentation
├── app.py                  # FastAPI application and API routes
├── core.py                 # Data preparation and feature definitions
├── train.py                # Model training and validation
├── model_cache.py           # Shared model loading
├── model.joblib             # Serialized trained model
├── metrics.json             # Model evaluation metrics
├── export.json              # Exported model information
├── chat.py                  # AI assistant integration
├── report.py                # Research report functionality
├── evidence.py              # Evidence-related functionality
├── nexttest.py              # Next-best-test ranking
├── research_lab.py          # Research experiments
├── requirements.txt         # Python dependencies
├── run_demo.py               # Local demo launcher
└── README.md                 # Project documentation
```

## Getting Started Locally

### Prerequisites

- Python 3.11 or newer, compatible with the project's dependencies
- Git
- pip

### 1. Clone the repository

```bash
git clone https://github.com/priyanshu2734/cardiomap-3d.git
cd cardiomap-3d
```

### 2. Create a virtual environment

**Windows — Git Bash:**

```bash
python -m venv .venv
source .venv/Scripts/activate
```

**Windows — PowerShell:**

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### 3. Install dependencies

```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### 4. Start the application

Try the project's demo launcher first:

```bash
python run_demo.py
```

If you prefer to start the API server directly:

```bash
uvicorn app:app --host 127.0.0.1 --port 8000
```

Open the application at:

- Application: http://127.0.0.1:8000/app
- API documentation: http://127.0.0.1:8000/docs
- Health endpoint: http://127.0.0.1:8000/health

If the model artifact is incompatible with your installed scikit-learn version, follow the model-retraining instructions below.

## Retraining the Model

The repository includes `data.xlsx` and `train.py`.

To train the models using the quick validation workflow:

```bash
python train.py data.xlsx --quick
```

To run the full training workflow with nested validation and rebuild the additional evaluation artifacts:

```bash
python train.py data.xlsx --rebuild-extras
```

The quick workflow skips nested validation and may omit additional evaluation information. Use the full workflow when you need the corresponding validation and supplementary artifacts.

Retraining overwrites generated model and evaluation files. Keep a backup if you need to preserve the existing artifacts.

## API Endpoints

The FastAPI backend exposes endpoints for predictions, explanations, research tools, and other application features.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/docs` | Interactive API documentation |
| GET | `/openapi.json` | OpenAPI schema |
| GET | `/metrics` | Model metrics |
| GET | `/audit` | Audit information |
| POST | `/predict` | Generate model predictions |
| POST | `/explain` | Generate prediction explanations |
| GET | `/shap/global` | Global feature importance |
| GET | `/chat/providers` | Available assistant providers |
| POST | `/chat` | AI assistant |
| POST | `/report` | Research report generation |
| POST | `/nexttest/rank` | Next-best-test ranking |
| POST | `/whatif/search` | What-if exploration |
| POST | `/api/stress-test/run` | Model stress testing |
| POST | `/api/case-replay/run` | Case replay |

For request parameters, response formats, and the complete endpoint list, see the [interactive API documentation](https://cardiomap-3d.onrender.com/docs).

## Testing

Where the relevant test files and dependencies are available, run the project's tests locally. For example:

```bash
python -m pytest
```

You can also inspect the API interactively through `/docs` after starting the server.

## Known Limitations

- The dataset contains only 303 records from a single cohort.
- The model has not been externally validated for clinical use.
- Vessel-level predictions can be less reliable than overall CAD predictions.
- The 3D coronary paths are schematic visualizations, not patient-specific anatomy.
- Model explanations describe model behavior and do not establish causation.
- Some assistant or research features may require additional configuration or model artifacts.
- Hosted services may experience cold starts or temporary downtime.

## Future Improvements

Potential future improvements include:

- Validation on independent datasets.
- Better probability calibration and uncertainty evaluation.
- Expanded testing and deployment monitoring.
- Improved model transparency and reproducibility.
- More robust handling of missing data and service failures.
- Additional research tools and visualization enhancements.

## Contributing

Contributions, bug reports, and suggestions are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Make and test your changes.
4. Open a pull request describing the changes.

Please avoid committing credentials, API keys, private patient information, or other sensitive data.

## License

Add the project's chosen open-source license before redistributing or reusing the code. Until a license is included in the repository, do not assume that the source code is available for unrestricted reuse.

## Author

**Priyanshu**

- GitHub: [@priyanshu2734](https://github.com/priyanshu2734)
- Project: [CardioMap 3D](https://github.com/priyanshu2734/cardiomap-3d)
- Live Demo: [cardiomap-3d.onrender.com/app](https://cardiomap-3d.onrender.com/app)

---

*Built as an AI and machine-learning research prototype for exploring coronary artery disease prediction, explainability, and interactive visualization.*

**For research and educational purposes only — not for clinical diagnosis or treatment decisions.**
