# 🚀 ClassSync

> AI-Powered Learning Recovery Platform

ClassSync is an intelligent academic recovery platform designed to help students recover from missed classes through AI-driven study planning, smart prioritization, progress tracking, and real-time attendance mapping.

Instead of functioning as a traditional attendance system, ClassSync focuses on solving the actual academic gap created when students miss classes.

---

# 📌 Problem Statement

In most schools and colleges:

* Attendance systems only track presence/absence.
* Students who miss classes struggle to identify:

  * what topics were missed
  * what to study first
  * how much backlog exists
  * how to recover efficiently

This creates learning gaps, academic stress, and poor recovery planning.

---

# 💡 Solution

ClassSync transforms attendance tracking into an AI-powered learning recovery system.

The platform:

* Maps missed topics to absent students
* Generates personalized AI recovery plans
* Prioritizes topics intelligently
* Tracks student progress
* Helps students recover smarter instead of studying randomly

---

# 🧠 Core Features

## 👨‍🏫 Teacher Module

Teachers can:

* Mark absent students
* Add class topics
* Track missed learning
* Manage recovery records

### Example

Teacher teaches:

```text
DBMS - Normalization
```

Absent students:

```text
Sai
Ravi
```

System automatically assigns this topic to those students.

---

## 🎓 Student Module

Students receive a personalized dashboard containing:

* Missed topics
* Recovery analytics
* AI-generated study plans
* Estimated study days
* Progress tracking
* Quiz system

---

# 🤖 AI Recovery Engine

One of the main innovations of ClassSync is the AI-powered recovery engine.

Instead of simply listing missed topics, the system intelligently prioritizes learning paths.

### Example

```text
Java Basics → OOP → Collections
```

If a student misses:

* OOP
* Collections

The system recommends:

```text
1. OOP
2. Collections
```

because Collections depends on OOP.

---

# 📚 AI Study Plan Generator

ClassSync creates structured recovery schedules.

### Example Plan

```text
Day 1 → Java Basics
Day 2 → OOP Concepts
Day 3 → Quiz + Revision
Day 4 → Collections Framework
```

This helps students recover without feeling overwhelmed.

---

# ⚡ Additional Features

## 💡 Explain Simply

Simplifies difficult concepts into beginner-friendly explanations.

---

## 🎯 Quick Quiz

Auto-generated quizzes help students revise missed topics quickly.

---

## 📊 Progress Tracker

Tracks:

* Completed topics
* Pending backlog
* Recovery percentage
* Learning consistency

---

# 🎨 Interface Design

The interface follows a futuristic AI-dashboard design using:

* Dark-mode UI
* Glassmorphism cards
* Animated backgrounds
* Gradient typography
* Interactive dashboards
* Responsive layouts

The goal was to create a modern SaaS-like educational experience.

---

# 🏗️ Tech Stack

## Frontend

* HTML5
* CSS3
* JavaScript (ES6)

## Backend

* Firebase Authentication
* Firebase Realtime Database

## Future AI Integrations

* OpenAI API
* Gemini API
* AI-generated summaries
* AI-generated quizzes

---

# 🔐 Authentication System

ClassSync uses Firebase Authentication for:

* Secure signup/login
* Session management
* Auto-login persistence
* Role-based access

Users are categorized into:

* Teacher
* Student

---

# ☁️ Database Architecture

## Users

```json
{
  "users": {
    "uid123": {
      "name": "Sai",
      "role": "student",
      "email": "sai@gmail.com"
    }
  }
}
```

## Attendance

```json
{
  "attendance": {
    "record1": {
      "student": "Sai",
      "topic": "Java OOP",
      "date": "2026-05-07",
      "status": "pending"
    }
  }
}
```

---

# 🔄 Real-Time Workflow

```text
Teacher marks attendance
           ↓
Data stored in Firebase
           ↓
Student dashboard updates instantly
           ↓
AI recovery plan generated
```

---

# 🚀 Future Scope

Planned future enhancements include:

* AI-generated explanations
* Smart quiz generation
* Predictive academic analytics
* Parent dashboards
* Faculty analytics
* AI weakness detection
* Notification system
* Mobile app support
* SaaS deployment

---

# 🎯 Project Vision

ClassSync aims to evolve beyond attendance management into a full-scale AI-powered academic intelligence platform that improves learning continuity and helps students recover academically in a smarter and more structured way.

---

# 🏆 Why This Project Matters

ClassSync combines:

| Domain                  | Integration |
| ----------------------- | ----------- |
| Education               | ✅           |
| Artificial Intelligence | ✅           |
| Real-time Systems       | ✅           |
| Analytics               | ✅           |
| Cloud Backend           | ✅           |
| Personalized Learning   | ✅           |

This makes it a scalable and impactful educational technology solution.

---

# 📷 Screenshots

*Add screenshots of:*

* Landing Page
* Teacher Dashboard
* Student Dashboard
* AI Study Plan
* Login System

---

# ⚙️ Installation

## Clone Repository

```bash
git clone <your-repository-link>
```

---

## Open Project

Open `index.html` in browser.

---

## Firebase Setup

1. Create Firebase Project
2. Enable Authentication → Email/Password
3. Enable Realtime Database
4. Add Firebase config in `index.html`

---

# 👨‍💻 Developed By

Sai Keerthana Nimma

---

# 🌟 Final Pitch

> “ClassSync is an AI-powered academic recovery platform that helps students intelligently recover missed learning through personalized recovery paths, smart prioritization, and real-time educational tracking.”
