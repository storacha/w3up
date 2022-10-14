## Classes

<dl>
<dt><a href="#Client">Client</a></dt>
<dd></dd>
</dl>

## Functions

<dl>
<dt><a href="#createClient">createClient(options)</a> ⇒ <code><a href="#Client">Client</a></code></dt>
<dd></dd>
</dl>

## Typedefs

<dl>
<dt><a href="#Result">Result</a> : <code>API.Result.&lt;unknown, ({error: true}|API.HandlerExecutionError|API.Failure)&gt;</code></dt>
<dd></dd>
<dt><a href="#strResult">strResult</a> : <code>API.Result.&lt;string, ({error: true}|API.HandlerExecutionError|API.Failure)&gt;</code></dt>
<dd></dd>
<dt><a href="#ClientOptions">ClientOptions</a> : <code>object</code></dt>
<dd></dd>
<dt><a href="#IdentityInfo">IdentityInfo</a> : <code>object</code></dt>
<dd></dd>
<dt><a href="#DelegationOptions">DelegationOptions</a> : <code>object</code></dt>
<dd></dd>
</dl>

<a name="Client"></a>

## Client
**Kind**: global class  

* [Client](#Client)
    * [new Client(options)](#new_Client_new)
    * [.agent()](#Client+agent) ⇒ <code>Promise.&lt;API.SigningPrincipal&gt;</code>
    * [.account()](#Client+account) ⇒ <code>Promise.&lt;API.SigningPrincipal&gt;</code>
    * [.currentDelegation()](#Client+currentDelegation) ⇒ <code>Promise.&lt;(API.Delegation\|null)&gt;</code>
    * [.identity()](#Client+identity) ⇒ [<code>Promise.&lt;IdentityInfo&gt;</code>](#IdentityInfo)
    * [.register(email)](#Client+register)
    * [.checkRegistration()](#Client+checkRegistration) ⇒ <code>Promise.&lt;UCAN.JWT&gt;</code>
    * [.whoami()](#Client+whoami) ⇒ [<code>Promise.&lt;Result&gt;</code>](#Result)
    * [.list()](#Client+list) ⇒ [<code>Promise.&lt;Result&gt;</code>](#Result)
    * [.makeDelegation(opts)](#Client+makeDelegation) ⇒ <code>Promise.&lt;Uint8Array&gt;</code>
    * [.importDelegation(bytes, alias)](#Client+importDelegation) ⇒ <code>Promise.&lt;API.Delegation&gt;</code>
    * [.upload(bytes, [origin])](#Client+upload) ⇒ [<code>Promise.&lt;strResult&gt;</code>](#strResult)
    * [.remove(link)](#Client+remove)
    * [.insights(link)](#Client+insights) ⇒ <code>Promise.&lt;object&gt;</code>

<a name="new_Client_new"></a>

### new Client(options)
Create an instance of the w3 client.


| Param | Type |
| --- | --- |
| options | [<code>ClientOptions</code>](#ClientOptions) | 

<a name="Client+agent"></a>

### client.agent() ⇒ <code>Promise.&lt;API.SigningPrincipal&gt;</code>
Get the current "machine" DID

**Kind**: instance method of [<code>Client</code>](#Client)  
<a name="Client+account"></a>

### client.account() ⇒ <code>Promise.&lt;API.SigningPrincipal&gt;</code>
Get the current "account" DID

**Kind**: instance method of [<code>Client</code>](#Client)  
<a name="Client+currentDelegation"></a>

### client.currentDelegation() ⇒ <code>Promise.&lt;(API.Delegation\|null)&gt;</code>
**Kind**: instance method of [<code>Client</code>](#Client)  
<a name="Client+identity"></a>

### client.identity() ⇒ [<code>Promise.&lt;IdentityInfo&gt;</code>](#IdentityInfo)
**Kind**: instance method of [<code>Client</code>](#Client)  
<a name="Client+register"></a>

### client.register(email)
Register a user by email.

**Kind**: instance method of [<code>Client</code>](#Client)  

| Param | Type | Description |
| --- | --- | --- |
| email | <code>string</code> \| <code>undefined</code> | The email address to register with. |

<a name="Client+checkRegistration"></a>

### client.checkRegistration() ⇒ <code>Promise.&lt;UCAN.JWT&gt;</code>
**Kind**: instance method of [<code>Client</code>](#Client)  
**Throws**:

- <code>Error</code> 

<a name="Client+whoami"></a>

### client.whoami() ⇒ [<code>Promise.&lt;Result&gt;</code>](#Result)
**Kind**: instance method of [<code>Client</code>](#Client)  
<a name="Client+list"></a>

### client.list() ⇒ [<code>Promise.&lt;Result&gt;</code>](#Result)
List all of the uploads connected to this user.

**Kind**: instance method of [<code>Client</code>](#Client)  
<a name="Client+makeDelegation"></a>

### client.makeDelegation(opts) ⇒ <code>Promise.&lt;Uint8Array&gt;</code>
**Kind**: instance method of [<code>Client</code>](#Client)  

| Param | Type |
| --- | --- |
| opts | [<code>DelegationOptions</code>](#DelegationOptions) | 

<a name="Client+importDelegation"></a>

### client.importDelegation(bytes, alias) ⇒ <code>Promise.&lt;API.Delegation&gt;</code>
**Kind**: instance method of [<code>Client</code>](#Client)  

| Param | Type |
| --- | --- |
| bytes | <code>Uint8Array</code> | 
| alias | <code>string</code> | 

<a name="Client+upload"></a>

### client.upload(bytes, [origin]) ⇒ [<code>Promise.&lt;strResult&gt;</code>](#strResult)
Upload a car via bytes.

**Kind**: instance method of [<code>Client</code>](#Client)  

| Param | Type | Description |
| --- | --- | --- |
| bytes | <code>Uint8Array</code> | the url to upload |
| [origin] | <code>string</code> \| <code>undefined</code> | the CID of the previous car chunk. |

<a name="Client+remove"></a>

### client.remove(link)
Remove an uploaded file by CID

**Kind**: instance method of [<code>Client</code>](#Client)  

| Param | Type | Description |
| --- | --- | --- |
| link | <code>API.Link</code> | the CID to remove |

<a name="Client+insights"></a>

### client.insights(link) ⇒ <code>Promise.&lt;object&gt;</code>
**Kind**: instance method of [<code>Client</code>](#Client)  

| Param | Type | Description |
| --- | --- | --- |
| link | <code>API.Link</code> | the CID to get insights for |

<a name="createClient"></a>

## createClient(options) ⇒ [<code>Client</code>](#Client)
**Kind**: global function  

| Param | Type |
| --- | --- |
| options | [<code>ClientOptions</code>](#ClientOptions) | 

<a name="Result"></a>

## Result : <code>API.Result.&lt;unknown, ({error: true}\|API.HandlerExecutionError\|API.Failure)&gt;</code>
**Kind**: global typedef  
<a name="strResult"></a>

## strResult : <code>API.Result.&lt;string, ({error: true}\|API.HandlerExecutionError\|API.Failure)&gt;</code>
**Kind**: global typedef  
<a name="ClientOptions"></a>

## ClientOptions : <code>object</code>
**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| [serviceDID] | <code>API.DID</code> | The DID of the service to talk to. |
| [serviceURL] | <code>string</code> | The URL of the service to talk to. |
| [accessURL] | <code>string</code> | The URL of the access service. |
| [accessDID] | <code>API.DID</code> | The DID of the access service. |
| settings | <code>Map.&lt;string, any&gt;</code> \| <code>string</code> \| <code>Settings.SettingsObject</code> | A map/db of settings to use for the client. |

<a name="IdentityInfo"></a>

## IdentityInfo : <code>object</code>
**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| agent | <code>API.SigningPrincipal</code> | The local agent principal |
| account | <code>API.SigningPrincipal</code> | The local account principal |
| with | <code>API.DID</code> | The current acccount (delegated) DID |
| proofs | <code>Array.&lt;API.Delegation&gt;</code> | The current delegation as a proof set. |

<a name="DelegationOptions"></a>

## DelegationOptions : <code>object</code>
**Kind**: global typedef  
**Properties**

| Name | Type |
| --- | --- |
| to | <code>API.DID</code> | 
| [expiration] | <code>number</code> | 

