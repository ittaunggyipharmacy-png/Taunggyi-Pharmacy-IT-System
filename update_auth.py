import sys

with open('src/App.tsx', 'r') as f:
    content = f.read()

target = ''' useEffect(() => {
 let unsubUserDoc: (() => void) | null = null;

 const unsubAuth = onAuthStateChanged(auth, async (user) => {
 if (unsubUserDoc) {
 unsubUserDoc();
 unsubUserDoc = null;
 }

 setCurrentUser(user);
 if (user) {
 try {
 const dbSettings = await getSettings();
 if (dbSettings) {
 setSettings(dbSettings);
 }
 } catch (settingsError) {
 console.error("Error loading settings on auth change:", settingsError);
 }

 const profile = await syncSystemUser(user);
 setUserProfile(profile);

 // Listen to the user's role/profile changes in real-time
 unsubUserDoc = onSnapshot(doc(db, "app_users", user.uid), (docSnap) => {
 if (docSnap.exists()) {
 const updatedProfile = docSnap.data() as SystemUser;
 setUserProfile(updatedProfile);
 
 const isSuperAdmin = [
 UserRole.ADMIN, 
 UserRole.ADMIN_CAPS, 
 UserRole.IT_SUPERVISOR, 
 UserRole.IT_SUPERVISOR_CAPS,
 UserRole.MERCHANDISING_SUPERVISOR,
 UserRole.IT_DIGITAL_MARKETING
 ].includes(updatedProfile.role as UserRole);
 setIsAdmin(isSuperAdmin);
 }
 }, (error) => {
 console.error("Profile onSnapshot error:", error);
 });

 // Define which roles are treated as super-admins with full access
 const isSuperAdmin = [
 UserRole.ADMIN, 
 UserRole.ADMIN_CAPS, 
 UserRole.IT_SUPERVISOR, 
 UserRole.IT_SUPERVISOR_CAPS,
 UserRole.MERCHANDISING_SUPERVISOR,
 UserRole.IT_DIGITAL_MARKETING
 ].includes(profile?.role as UserRole);
 setIsAdmin(isSuperAdmin);
 } else {
 setUserProfile(null);
 setIsAdmin(false);
 }
 setAuthReady(true);
 });

 return () => {
 unsubAuth();
 if (unsubUserDoc) {
 unsubUserDoc();
 }
 };
 }, []);'''

replacement = ''' useEffect(() => {
 let unsubUserDoc: (() => void) | null = null;

 const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
 if (unsubUserDoc) {
 unsubUserDoc();
 unsubUserDoc = null;
 }

 const user = session?.user || null;
 setCurrentUser(user as any); // Type assertion for now to avoid cascading type errors
 if (user) {
 try {
 const dbSettings = await getSettings();
 if (dbSettings) {
 setSettings(dbSettings);
 }
 } catch (settingsError) {
 console.error("Error loading settings on auth change:", settingsError);
 }

 // Passing Supabase user instead of Firebase user
 const profile = await syncSystemUser(user);
 setUserProfile(profile);

 // Try catching firestore issues if dummy key fails
 try {
 unsubUserDoc = onSnapshot(doc(db, "app_users", user.id), (docSnap) => {
 if (docSnap.exists()) {
 const updatedProfile = docSnap.data() as SystemUser;
 setUserProfile(updatedProfile);
 
 const isSuperAdmin = [
 UserRole.ADMIN, 
 UserRole.ADMIN_CAPS, 
 UserRole.IT_SUPERVISOR, 
 UserRole.IT_SUPERVISOR_CAPS,
 UserRole.MERCHANDISING_SUPERVISOR,
 UserRole.IT_DIGITAL_MARKETING
 ].includes(updatedProfile.role as UserRole);
 setIsAdmin(isSuperAdmin);
 }
 }, (error) => {
 console.error("Profile onSnapshot error:", error);
 });
 } catch (e) {
 console.error("Firestore onSnapshot setup failed", e);
 }

 const isSuperAdmin = [
 UserRole.ADMIN, 
 UserRole.ADMIN_CAPS, 
 UserRole.IT_SUPERVISOR, 
 UserRole.IT_SUPERVISOR_CAPS,
 UserRole.MERCHANDISING_SUPERVISOR,
 UserRole.IT_DIGITAL_MARKETING
 ].includes(profile?.role as UserRole);
 setIsAdmin(isSuperAdmin);
 } else {
 setUserProfile(null);
 setIsAdmin(false);
 }
 setAuthReady(true);
 });

 return () => {
 subscription.unsubscribe();
 if (unsubUserDoc) {
 unsubUserDoc();
 }
 };
 }, []);'''

if target in content:
    content = content.replace(target, replacement)
    with open('src/App.tsx', 'w') as f:
        f.write(content)
    print('Replaced!')
else:
    print('Target not found!')
