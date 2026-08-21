import sys

with open('src/services/firestoreService.ts', 'r') as f:
    content = f.read()

target = 'export const syncSystemUser = async (firebaseUser: any) => {\n try {\n const userRef = doc(db, USER_COLLECTION, firebaseUser.uid);'
replacement = 'export const syncSystemUser = async (firebaseUser: any) => {\n try {\n const uid = firebaseUser.uid || firebaseUser.id;\n const userRef = doc(db, USER_COLLECTION, uid);'

if target in content:
    content = content.replace(target, replacement)
    
    # Replace other uses in the file
    content = content.replace('firebaseUser.uid', 'uid')
    
    with open('src/services/firestoreService.ts', 'w') as f:
        f.write(content)
    print('Replaced!')
else:
    print('Target not found!')
