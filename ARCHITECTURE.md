# Foreword

This describes the implementation of an infinitely scalable storage with
retainable performance. The main aspect of scaling a file storage infinitely
is detaching it from storage itself and handle the aspect of distributing.

There are certain challenges to solve, which are efficient file operations,
with and without encryption.

# The distribution platform

The concept is quite simple, we separate metadata from storage. Our service
only is capable of talking to s3 servers (and eventually other protocols)
and storing metadata to its own database. The database itself is kept scalable
by choosing a proper model to run a db. If the expected scale is truly infinite
a good target is cockroachdb. If the expected scale is in a lower boundary, a
1-3TB RAM postgres instance or KV service would probably do well as well.

Our service does the following things upon storing data:

- It receives the upload stream and directly streams it to the s3

This is important to check and enforce policies and requirements around uploaded
files and also to get corruption checkups in place. This aspect is scalable, but
more or less compute expensive.

- It creates stores and file references in its metadata db
- It creates a file uuid for the object on the target s3 instead of using the real name
- It provides RBAC permission capabilities on store and file level
- It issues temporary file accesses (a few seconds) on the s3 upon a download request
- It stores encryption metadata
- It handles lifecycle events (deleting, moving, copying)
- It handles locking mechanisms
- It handles authentication

What it can not do:

- Search efficiently for content inside of files (this might be possible to mitigate if no encryption is involved)
- Edit files without completely reuploading them (unless a non object store implementation would exist)

## Data structure

The data structure consists out of a storage container, files and a directory listing.
The storage container contains either one or many files. They can enforce certain things
on the files it contains, but may also just contain only a single file. A file is part of
the container and actually references a file stored on some storage location.
Last but not least the directory listing lists a hirarchical structure. An item of this is either
a container, a file or both. An item itself is either a directory, or a file entry. If an item is a
file+container and itself a file entry, this would be a single file container.

# Encryption

To secure files an operator may want to encrypt all their data. To make this
as secure as possible, every file has its own encryption key. This encryption
key gets stored optionally once encrypted for the service itself, or in an e2e
mode encrypted for every individual user.

A user based encryption works the following way: The key is exposed to the user
who encrypts the same in their own end. The encryption is done with the users
password and a backend provided encryption salt. The backend never gets to know
the users password itself. The hashing is also not the same as the one used for
authentication.

The backend now simply saves the encrypted payload for the user. The user can
request this payload by successfully authenticating theirself.

# Integration

This services may be used by other services which integrate with it. Certain
aspects require this services to do certain things to avoid breaking with the
system.

The integrating system may not use the same hashing procedure to authenticate
its users, as used by the encryption.

# Efficient encryption operations

To ensure that encryption can operate in the most efficient manner possible
there should be multiple models. A server side encryption (which we will not
focus on at all in the initial implementation) and the client side encryption.

Server side some things are easier to solve, since the backend takes care of
encrypting and decrypting things, so it is pretty straightfoward. If we however
want to detach the backend from the duty of downloading data, the client must
be capable of decrypting data individually.

## Efficient client side operations

To make this things efficient, a copy operation should not need to download
an asset and reencrypt + reupload it. Instead the file reference should be
duplicated and the decryption key should be encrypted for the new user
individually.

This way a file copy operation is not incurring any load at all. File move
operations should be also purely metadata based unless the goal is to move
the file to a different filer location.

## The drawbacks

This however opens new attack vectors:

- Keys are exposed to the user

To mitigate the risk access to files is restricted by issuing only short lived
file requests. Short means a matter of seconds. This means upon querying a file
for download, the service will tell the client the download url, which can only
be accessed to start the download for a few seconds. A download that is running
will continue, but the url becomes useless.
This comes from the believe that if you granted a user access to a file, the
file should be considered compromised already anyway in that regard. So
exposing the file is equal to exposing its encryption key.
The second mitigation is to use an individual key for every single file.

- Keys are eventually retrievable on a leaked database

When the databases gets hacked for whatever reason, then an attacker can try to
recover the encryption keys. With every user having their individual encrypted
instance of the file encryption key, the risk increases of a poorly protected
one, since they are protected with passwords.
To mitigate this we split the encryption key in two parts. One part we store
encrypted with the systems pepper. Additionally the db should enable encryption
at rest. This way when a database got leaked, but not the configuration of the
running service was leaked, all the encryption secrets remain safe. If an
attacker gets knowledge of both, security degrades to the weakest link
(user password).

Additionally we will offer a certificate based login and encryption system with
enforcing policies for systems that require to get even higher security standards.

# Versioning

Versioning can be easily supported but wont be part of the first standard
implementation.
