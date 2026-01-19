# MindForge – Full Stack Generative AI Agent

## Overview

MindForge is a full stack Generative AI agent application designed to help users convert unclear personal or academic goals into structured, actionable plans.

The system is built using **Pydantic AI**, enabling strict schema validation and reliable agent orchestration rather than unstructured chatbot-style responses.

This project was developed as part of an academic assessment requiring a **live deployed, end-to-end usable AI agent system**.

---

## Live Application

**Live URL:**  
https://mindforge-ai-psi.vercel.app/

---

## GitHub Repository

https://github.com/sj3035/mindforge-ai.git

---

## Problem Statement

Many individuals struggle with:
- unclear goals  
- difficulty breaking tasks into steps  
- decision fatigue  
- lack of structured planning  

Most AI tools generate free-form text that is hard to act upon.

MindForge solves this problem by generating **schema-validated, structured execution plans** using a controlled AI agent architecture.

---

## Solution Approach

MindForge implements a **Pydantic AI–based agent system** where:

- user inputs are validated using Pydantic schemas
- the agent reasons over validated data
- outputs must strictly conform to predefined structures
- retry and fallback logic ensures reliability
- results are presented through a clean and intuitive UI

This approach improves consistency, reliability, and usability.

---

## Key Features

- Full stack Generative AI agent
- Mandatory use of **Pydantic AI**
- Strict input and output validation
- Structured goal planning output
- Clean UX and smooth product flow
- Loading and error handling states
- Free LLM usage via OpenRouter
- Live deployed and fully functional

---

## System Architecture

This project demonstrates a type-safe, schema-validated AI pipeline:

1.  **Frontend (Lovable.dev):** A high-fidelity React UI that sends structured user goals to the API.
2.  **Backend (FastAPI):** A Python-based middleware that manages the agent's lifecycle and logic.
3.  **Pydantic AI Agent:** Uses Pydantic's powerful validation to ensure LLM outputs are structured and predictable.
4.  **OpenRouter (LLM):** Connects to free or low-cost models (Phi-3, Mistral, Gemma) to process reasoning tasks.
5.  **Schema Validation:** Ensures the UI only receives data that matches the frontend's expected types.

---
