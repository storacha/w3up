import subprocess
import sys
import platform
from setuptools import setup, find_packages

def check_w3cli():
    print("🔍 Checking for w3cli...")
    try:
        subprocess.run(["w3", "--version"], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        print("✅ w3cli is already installed.")
        return True
    except FileNotFoundError:
        print("❌ w3cli not found.")
        print("📦 Installing w3cli globally...")
        try:
            subprocess.run("npm install -g @web3-storage/w3cli", shell=True, check=True)
            print("✅ w3cli installed successfully.")
            return True
        except subprocess.CalledProcessError as e:
            print(f"❌ Failed to install w3cli: {e}")
            print("Please install it manually with: npm install -g @web3-storage/w3cli")
            return False

w3cli_installed = check_w3cli()

with open('requirements.txt') as f:
    requirements = f.read().splitlines()

setup(
    name="storacha_uploader",
    version="0.1.0",
    packages=find_packages(),
    install_requires=requirements,
    entry_points={
        "console_scripts": [
            "storacha-uploader=storacha_uploader:main",  
        ],
    },
    author="Amit Pandey",
    author_email="a_pandey1@ce.iitr.ac.in",
    description="A tool to automate IPFS DAG creation, CAR file generation, and Web3 Storage upload.",
    long_description=open("README.md").read() if sys.version_info[0] >= 3 else "",
    long_description_content_type="text/markdown",
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
    python_requires=">=3.6",
)

print("\n✅ Setup completed.")
print("📝 Note: Make sure Node.js and npm are installed on your system.")
print("🚀 You can now use the 'storacha-uploader' command to upload files to Storacha network.")
