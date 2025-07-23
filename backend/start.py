#!/usr/bin/env python3
import os
import sys
import uvicorn

# Запускаем uvicorn с нужными параметрами
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, log_level="info") 