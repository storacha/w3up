import subprocess
import sys
import os
import json
import requests
from config import SPACE_NAME

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

try:
        space_data = json.loads(space_output)
        space_did = space_data.get("did", "Unknown DID")
        print(f"✅ Space created successfully. DID: {space_did}")
except json.JSONDecodeError:
        print(f"✅ Space created. CLI Output: {space_output}")
        space_did = space_output.strip() 


def create_delegation():
    print("🔑 Creating delegation...")
    delegation = run_command("w3 delegation create")
    print("✅ Delegation created.")
    return delegation

def get_http_auth():
    print("🔍 Retrieving HTTP authentication details...")
    auth_json = run_command("w3 bridge generate-tokens")
    auth_data = json.loads(auth_json)
    return auth_data["X-Auth-Secret"], auth_data["Authorization"]

def upload_car_file(car_file, x_auth_secret, authorization):
    print(f"📤 Uploading CAR file: {car_file} to Storacha HTTP bridge...")
    
    # Define the URL endpoint for upload
    upload_url = "https://w3s.link/api/upload"
    headers = {
        "X-Auth-Secret": x_auth_secret,
        "Authorization": authorization,
        "Content-Type": "application/car"
    }
    
    with open(car_file, 'rb') as file:
        response = requests.post(upload_url, headers=headers, files={"file": file})
    
    if response.status_code == 200:
        receipt = response.json()
        print("✅ Upload successful! Client Receipt:")
        print(json.dumps(receipt, indent=4))
        return receipt
    else:
        print(f"❌ Upload failed: {response.text}")
        sys.exit(1)

# Main execution
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python storacha_upload.py <file-path>")
        sys.exit(1)
    
    file_path = sys.argv[1]
    space_name = "MyStorachaSpace"
    
    cid, car_file = create_dag_and_car(file_path)
    
    space_did = create_w3_space(space_name)
    create_delegation()
    
    x_auth_secret, authorization = get_http_auth()
    
    client_receipt = upload_car_file(car_file, x_auth_secret, authorization)
    
    #Client receipt
    receipt_file = "client_receipt.json"
    with open(receipt_file, "w") as f:
        json.dump(client_receipt, f, indent=4)
    print(f"📜 Client receipt saved to {receipt_file}")
