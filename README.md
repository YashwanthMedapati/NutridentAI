# NutriDent AI README

Paste this into your `README.md` on GitHub:

````md
# 🦷 NutriDent AI

NutriDent AI is a full-stack AI-powered oral health and nutrition analytics platform that combines machine learning, food-risk analysis, barcode scanning, image-based food recognition, and wellness tracking into a unified healthcare application.

The platform predicts dental caries risk using a Random Forest machine learning model trained on NHANES healthcare datasets and performs real-time nutritional and oral-risk analysis using multiple external APIs.

---

# 🚀 Features

- AI-powered dental caries risk prediction
- Food cariogenic risk analysis
- Image-based food recognition
- Barcode & QR food scanning
- Portion-aware nutrition analysis
- Wellness and calorie tracking
- Hydration monitoring
- Interactive analytics dashboards
- Personalized dentist notes & action plans
- Dark/Light mode UI
- Gamified wellness tracking with streaks and badges

---

# 🧠 Machine Learning

- Model: Random Forest Classifier
- Dataset: NHANES Healthcare Dataset
- Records Used: 6,400+
- Features: 20+ nutritional & lifestyle features
- Accuracy Achieved: ~70%

The ML pipeline evaluates dietary habits, sugar intake, smoking behavior, fast-food frequency, and oral-health related lifestyle patterns to estimate dental caries risk.

---

# 🍎 Food Risk Engine

NutriDent AI includes a rule-based food analysis engine that computes:

- Exposure Score
- Protective Score
- Frequency Risk
- Net Oral Risk Index (NORI)

The system evaluates:
- Sugar content
- Carbohydrate load
- Food texture/stickiness
- Portion size
- Calcium and protective nutrients
- Consumption frequency

---

# 🔗 APIs & Integrations

- USDA FoodData Central API
- Open Food Facts API
- Google Vision API
- html5-qrcode

---

# 🛠 Tech Stack

## Frontend
- React.js
- JavaScript
- Recharts
- Context API
- CSS3

## Backend
- Python
- FastAPI
- Scikit-learn
- Pandas
- NumPy
- Joblib
- Uvicorn

---

# 📊 Main Modules

- Home Dashboard
- Analyze Food
- Risk Assessment
- NutriDent Coach
- Nutrition Tracker
- Wellness Analytics
- Previous Results
- Tips & Recommendations

---

# 📷 Functionalities

## Analyze Food
Users can:
- Upload food images
- Scan packaged food barcodes
- Search food manually

The system generates:
- Calories & nutritional values
- Cariogenic food-risk analysis
- AI dentist notes
- Personalized action plans

## Risk Assessment
Step-by-step questionnaire for predicting:
- Low Risk
- Medium Risk
- High Risk

based on user lifestyle and dietary behavior.

## NutriDent Coach
Tracks:
- Calories
- Water intake
- Wellness score
- Weight goals
- Nutrition balance
- Daily streaks
- Achievement badges

---

# ⚙️ Running the Project

## Backend

```bash
cd backend
venv\Scripts\activate
uvicorn main:app --reload
````

Backend runs on:

```bash
http://127.0.0.1:8000
```

Swagger API Docs:

```bash
http://127.0.0.1:8000/docs
```

---

## Frontend

```bash
cd frontend
npm install
npm start
```

Frontend runs on:

```bash
http://localhost:3000
```

---

# 📌 Future Improvements

* Advanced AI-based portion estimation
* Mobile application deployment
* Cloud database integration
* User authentication system
* Deep learning food recognition
* Wearable device integration
* Longitudinal oral-health analytics

---

# 👨‍💻 Author

Yashwanth Reddy Medapati
M.S. Computer Science
Binghamton University

GitHub: [https://github.com/YashwanthMedapati](https://github.com/YashwanthMedapati)

```
```
