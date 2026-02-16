
# 📖 Cozy Library

## Dynamic, mood-aware background music for an immersive reading experience.

**Cozy Library** bridges the gap between literature and sound. It solves the mismatch problem where a high-tension thriller chapter is accidentally paired with a lo-fi chill beat. By analyzing metadata and real-time text sentiment, Cozy Library curates a soundscape that evolves with your story.

## 🛠 How It Works
Cozy Library employs a multi-layered analysis to ensure audio-visual synchrony:

### 1. Contextual Analysis
Extracts static metadata (Genre, Author, Period) to set the overarching musical "theme."

### 2. Sentiment Mapping
Processes chapter-level text to identify shifting moods (e.g., suspense, joy, melancholy).

### 3. Curation Engine
Cross-references the theme and current mood to trigger seamless audio transitions via our library or external providers.

## ✨ Features
Curated Mood Libraries: Expertly picked tracks for specific emotional archetypes.

Intelligent Transitions: Cross-fading logic that triggers music shifts based on your progress in the book.

Metadata Integration: High-accuracy genre detection to ensure a Victorian novel doesn't sound like a Cyberpunk thriller.

## 🚀 Tech Stack

### Frontend
Next.js (React), Tailwind CSS

### Backend
NestJS (Node.js framework)

### Language
TypeScript

### Database
MongoDB

## Getting Started
### Prerequisites

- Node.js (v24.0.0 or higher)
- MongoDB instance

## Installation
1. Clone the repository
git clone https://github.com/mugrichart/cozylibrary.git
cd cozylibrary
2. Install dependencies
cd backend
pnpm install
cd ../frontend
pnpm install
3. Set up Environment Variables
Create a .env file in the root directory
4. Run the application
frontend: pnpm run dev
backend: pnpm start:dev

## Roadmap
