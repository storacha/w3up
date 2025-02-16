from setuptools import setup, find_packages

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
        ],
    },
    author="Amit Pandey",
    author_email="a_pandey1@ce.iitr.ac.in",
    description="A tool to automate IPFS DAG creation and CAR file generation.",
    long_description=open("README.md").read(),
    long_description_content_type="text/markdown",
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
    python_requires=">=3.6",
)
