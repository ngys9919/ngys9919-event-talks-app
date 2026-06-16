<div align="center">

# BigQuery Release Notes Hub & Social Sharer

[![Python Version](https://img.shields.io/badge/Python-3.14%2B-blue.svg?logo=python&logoColor=white)](https://www.python.org/)
[![Framework](https://img.shields.io/badge/Framework-Flask%203.1.3-lightgrey.svg?logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/ngys9919/ngys9919-event-talks-app.svg?style=flat)](https://github.com/ngys9919/ngys9919-event-talks-app/stargazers)

**A modern, premium dashboard to explore BigQuery release notes and instantly share individual updates on X/Twitter.**

[Demo](http://127.0.0.1:5000) · [Report Bug](https://github.com/ngys9919/ngys9919-event-talks-app/issues) · [Request Feature](https://github.com/ngys9919/ngys9919-event-talks-app/issues)

</div>

---

## 📖 About

This application fetches Google Cloud's official BigQuery Release Notes RSS Feed, parses the Atom XML structure, segments the content, and renders it in an immersive dark-theme web dashboard. Rather than displaying daily bulks of updates, the custom parser splits them by headings into individual, selectable cards. Users can search and filter notes by type, customize a draft text with one-click hashtags, and share it on X/Twitter.

### Key Features
- **Smart Segmenting**: Splits daily release bundles into clean, individual update items.
- **Dynamic Real-Time Filtering**: Search keywords and filter by change type (*Feature, Change, Announcement, Breaking, Issue, Update*).
- **Interactive Tweet Dashboard**: Dedicated panel for crafting, previewing, and posting updates.
- **Cache Management**: 30-minute backend caching with manual bypass capability using a spinner-animated refresh button.
- **Premium Aesthetics**: Dynamic dark-mode CSS with glassmorphic cards, transition animations, and skeleton loaders.

---

## 🛠️ Tech Stack

| Category | Technology | Logo/Badge |
|---|---|---|
| **Backend** | Python, Flask, requests | ![Flask](https://img.shields.io/badge/Flask-000000?style=flat&logo=flask&logoColor=white) |
| **Parsing** | xml.etree.ElementTree, BeautifulSoup4 | ![BeautifulSoup](https://img.shields.io/badge/BS4-4B0082?style=flat&logo=python&logoColor=white) |
| **Frontend UI** | HTML5, Vanilla CSS3, Vanilla JS | ![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white) ![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white) ![JS](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black) |
| **Socials** | Twitter Web Intents | ![X](https://img.shields.io/badge/X-000000?style=flat&logo=x&logoColor=white) |

---

## 📐 System Architecture

```
                                 +-----------------------+
                                 |  Google Cloud Feed    |
                                 |  (BigQuery XML RSS)   |
                                 +-----------+-----------+
                                             |
                                             v (HTTP Request)
                                 +-----------+-----------+
                                 |   Flask Backend API   |
                                 |                       |
                                 |  [ XML / HTML Parser] |
                                 |  [ Memory Cache ]     |
                                 +-----------+-----------+
                                             |
                                             v (JSON API)
+--------------------------------------------+--------------------------------------------+
| Vanilla Frontend (UI)                                                                   |
|                                                                                         |
|  +-----------------------------+   +-------------------+   +-------------------------+  |
|  |     List & Card Render      |   |   Search & Filter |   |  Tweet Composer Panel   |  |
|  |  (Features, Changes, etc.)  |   |   State Manager   |   |  (Presets & Validation) |  |
|  +-----------------------------+   +-------------------+   +-----------+-------------+  |
+------------------------------------------------------------------------|----------------+
                                                                         v
                                                             +-----------+-----------+
                                                             |    X/Twitter Share    |
                                                             |    (Web Intent Link)  |
                                                             +-----------------------+
```

---

## 📂 Project Structure

```
bq-releases-notes/
├── app.py                # Flask main application & feed parsing algorithms
├── requirements.txt      # Python dependencies
├── .gitignore            # Version control exclusions
├── templates/
│   └── index.html        # Main HTML skeleton & layout
└── static/
    ├── css/
    │   └── style.css     # Dark mode style rules & transitions
    └── js/
        └── main.js       # Client state, filter operations & web intents
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+ installed.
- Git (optional).

### Setup & Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/ngys9919/ngys9919-event-talks-app.git
   cd ngys9919-event-talks-app
   ```

2. **Create a virtual environment**:
   ```bash
   python -m venv venv
   ```

3. **Activate the environment**:
   - **Windows PowerShell**:
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   - **macOS / Linux**:
     ```bash
     source venv/bin/activate
     ```

4. **Install backend packages**:
   ```bash
   pip install -r requirements.txt
   ```

5. **Run the local development server**:
   ```bash
   python app.py
   ```

6. Open your browser and navigate to **[http://127.0.0.1:5000](http://127.0.0.1:5000)**.

---

## ⚙️ Deployment

### Running with Docker

1. Create a `Dockerfile` in the root directory:
   ```dockerfile
   FROM python:3.11-slim
   WORKDIR /app
   COPY requirements.txt .
   RUN pip install --no-cache-dir -r requirements.txt
   COPY . .
   EXPOSE 5000
   CMD ["python", "app.py"]
   ```

2. Build and run the image:
   ```bash
   docker build -t bq-release-notes-hub .
   docker run -p 5000:5000 bq-release-notes-hub
   ```

---

## 🤝 Contributing

Contributions are welcome! If you would like to help improve the tool:
1. **Fork** the repository.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. **Commit** your changes (`git commit -m 'Add some AmazingFeature'`).
4. **Push** to the branch (`git push origin feature/AmazingFeature`).
5. Open a **Pull Request**.

For suggestions or questions, please open an issue in the tracker.

---

## 🧑‍💻 Developed By

**Eric Ng** - [GitHub Profile](https://github.com/ngys9919)

---

## 💖 Acknowledgements
- [Google Cloud Platform](https://cloud.google.com/) for maintaining the public BigQuery feed.
- [Shields.io](https://shields.io/) for providing high-quality metadata badges.
