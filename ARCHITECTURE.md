# Simple architecture

The secure storage service is an ultra simple straight forward, know nothing provider for any kind of storage. It doesn't implement any storage itself. By default we assume structured data and just save it to a database. Alternatively we may add s3 later.

## Client Side Implementation

- Get current valid session by api token auth.
- ask `/info` route for specific token
- if non error, get back encrypted payload
- decrypt with user supplied password

## Server Side Implementation

### Registration

Default reg by WizardTales®.

### Auth

- Default auth by WizardTales®. (also used for api token)
- SSO auth

### /info

- Method: GET/POST

Route(GET):

`/info/token-uuid`

Payload (POST):

```json
{ "encrypted text": "test", "roles": ["rolename"] }
```

By default only the creator gets permissions.

### /permission

- Method: GET/POST

Route (GET):

`/permission/token-uuid`

Payload (POST):

```json
{"role":"name", "permissions":[{"role": name},{"secret": "name"}]}
```

Simple RBAC based permission system

### Key Handling Role

- When a role selects a new subrole, the creator must be an owner of it
- Direct access to a key of a role or user requires them to reencrypt a new key
- A new parent role will have its own encryption token
- When a member gets added to a new role, the creater must be an owner of it
- The requestor must be in an active exchange session, this session is usually short lived (20 seconds). Only from the publisher side a less secure window (i.e. 24 hours) can be chosen.
- The requestor will be asked to enter his account password, which will be authenticated and next combined with the rolename.
- The finally encrypted password will be only send encrypted with the first (highest in chain) password to not reveal the chain of trust.
- The user might be a requestor process (api required)

The least trusted level is directly on the same machine. The group service can run within an own container inside the same pod. Authorization is only applied from the user level, not from application access level.

Only end level keys are ultimately secure in regards of key secrecy. As soon as deduplicated keys are involved, the secrecy decreases to the service and group level. Either breach of security results in breach of information.

After every end key add action a copy of the secret gets created unless decreased security deduplication is activated.

The further away the scope (storage and encryption) are from each other the less likely side attacks become. I.e. a breach of the total storage system, for whatever reason, would not result in breach information when its scope is 100% phyiscally disconnected.

Key rotation, happens on on the key owner level. The key owner is not the creator, but the process responsible rotating it. Rotating in total is always an expensive process, since in any case all essential consuming parties (credential users) must be involved. We can't just change the password to the database without letting the process know so. Rotation starts with first creating a new credential and ends with ackknowledgement. If such actions can be without a downtime involved depends on the authentication system of the end systems involved. Usual password authentications are in general are not, so be aware of the short downtime caused.
To rotate an individual key, a single user has to proof it knew the last password which is stored individually. If that user did not login for a very long time, or if a password has been marked breached, it requires another authorized user to give back access.
