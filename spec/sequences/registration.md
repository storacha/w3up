Regisitration is different depending on whether the app implements user-pays or app-pays storage payment models.

# Payment models

The two basic models are **user pays** and **app pays**. One is low-commitment for the developer, the other is invisible to the user. More nuanced hybrid models are also possible.

## User pays (transparent to developer)

In the default case, when a developer adds w3ui components to their application, the user is prompted to create a new (or link to an existing) account with web3.storage, where uploads are stored. When the user exceeds free plan usage, they will be prompted to provide a payment method.

### Registration on first run (user pays)

```mermaid
sequenceDiagram
    participant Biometric
    participant Email Client
    participant AppUI
    participant Keyring
    participant AppServer
    participant Storage
    
    Note over AppServer, Storage: "The Cloud"
    Note over Biometric, Keyring: Alice's  Device
    Note over Biometric: Biometric <br>is optional
    
    AppUI ->> AppServer: Fetch web UI
    AppServer -->> AppUI: HTML content
    Note over AppUI: Running app
    
    AppUI ->> Keyring: Create DID
    Keyring ->> Biometric: New key please
    Note over Biometric: Scan face or <br>thumb and generate <br>private key.
    Biometric -->> Keyring: Here's a ref to it
    Note over Keyring: Collect email
    Keyring ->> Storage: Link this email to this DID
    Storage ->> Email Client: Send email with validation link
    Email Client -->> Storage: Alice clicks the validation link
    Storage -->> Keyring: Your DID is linked to your email, <br>choose from these accounts or create a new one
    Note over Keyring: Choose account
    Keyring -->> AppUI: Your DID can upload now
    Note over AppUI: Store DID in session<br>Should this be earlier?
```

> The word "account" in the "Choose account" box is confusing. Since your billing account (email-level grouping) can have very many of these (roughly one per app). And your keyring identity can have access to these namespaces without paying for them. So maybe we call them "buckets" or "containers" or "apps" or "namespaces". Maybe they are the same thing we give w3names to? --- @jchris 

## App pays (transparent to user)

This assumes the App Server has already established a Storage account, and has access to private key signing capabilities (perhaps via an embedded web3.storage keyring). The servers's account will delegate access to user DIDs.

### Registration on first run (app pays)


```mermaid
sequenceDiagram
    participant Biometric
    participant AppUI
    participant Keyring
    participant AppServer
    
    Note over AppServer: "The Cloud"
    Note over Biometric, Keyring: Alice's  Device
    Note over Biometric: Biometric <br>is optional
    
    AppUI ->> AppServer: Fetch web UI
    AppServer -->> AppUI: HTML content
    Note over AppUI: Running app
    
    AppUI ->> Keyring: Create DID
    Keyring ->> Biometric: New key please
    Note over Biometric: Scan face or <br>thumb and generate <br>private key.
    Biometric -->> Keyring: Here's a ref to it
    Keyring -->> AppUI: Here is an unlinked DID
    AppUI ->> AppServer: Please delegate storage access to this DID 
    Note over AppServer: Validate user session<br>& sign delegation
    AppServer -->> AppUI: Here's a delegation so your DID can upload now
        Note over AppUI: Store DID in session<br>Should this be earlier?
    
```

> It might make sense to detail out the AppServer interactions with the AppServer Keyring. Currently the details on the app server delegation are elided.

