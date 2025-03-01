import subprocess
import sys
import os

def run_command(command):
    try:
        result = subprocess.run(command, shell=True, check=True, text=True, capture_output=True)
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f"❌ Error: {e.stderr}")
        sys.exit(1)

def create_dag_and_car(file_path):
    if not os.path.exists(file_path):
        print(f"❌ Error: File '{file_path}' not found.")
        sys.exit(1)

    print(f"📂 Adding '{file_path}' to IPFS DAG...")
    cid = run_command(f"ipfs add --cid-version=1 --raw-leaves --quieter {file_path}")
    print(f"✅ File added to DAG. CID: {cid}")

    car_file = f"{file_path}.car"
    print(f"📦 Exporting DAG to CAR file: {car_file}...")
    run_command(f"ipfs dag export {cid} > {car_file}")
    print(f"✅ CAR file created: {car_file}")

    return cid, car_file

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python dag_to_car.py <file-path>")
        sys.exit(1)

    file_path = sys.argv[1]
    cid, car_file = create_dag_and_car(file_path)
