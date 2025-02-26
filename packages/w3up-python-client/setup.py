import subprocess
import sys
from setuptools import setup, find_packages

def check_w3cli():
    """Check if w3cli is installed, otherwise prompt installation."""
    try:
        subprocess.run(["w3", "--version"], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        print("✅ w3cli is already installed.")
    except FileNotFoundError:
        print("❌ w3cli not found. Please install it using:\n    npm install -g @web3-storage/w3")
        sys.exit(1)

check_w3cli()

setup(
    name="dag_to_car",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "requests",
        "python-dotenv",
    ],
    entry_points={
        "console_scripts": [
            "dag-to-car=dag_to_car:main",
            "storacha-http-bridge=storacha_http_bridge:main",  # Add entry point for storacha_http_bridge.py
        ],
    },
    author="Amit Pandey",
    author_email="a_pandey1@ce.iitr.ac.in",
    description="A tool to automate IPFS DAG creation, CAR file generation, and Web3 Storage upload.",
    long_description=open("README.md").read(),
    long_description_content_type="text/markdown",
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
    python_requires=">=3.6",
)
