**App**: all

## MODIFIED Requirements

### Requirement: Auth context tracks session state
The `AuthProvider` SHALL check the current session on mount by calling `authApi.me`, and expose `userId`, `email`, `displayName`, `loading`, `logout`, and `setUserId` to any descendant via `useAuth`. The `email` and `displayName` fields SHALL be set from the `/me` response and cleared to null on logout.

#### Scenario: Session detected on mount
- **WHEN** `AuthProvider` mounts and `authApi.me` returns a userId
- **THEN** `useAuth().userId`, `useAuth().email`, and `useAuth().displayName` are set to the values from the response and `loading` becomes false

#### Scenario: No session on mount
- **WHEN** `AuthProvider` mounts and `authApi.me` returns 401
- **THEN** `useAuth().userId`, `useAuth().email`, and `useAuth().displayName` are all null and `loading` becomes false

#### Scenario: Logout clears client-side session
- **WHEN** `useAuth().logout()` is called
- **THEN** `authApi.logout` is called and `userId`, `email`, and `displayName` are all set to null

#### Scenario: useAuth used outside AuthProvider throws
- **WHEN** a component calls `useAuth()` with no `AuthProvider` ancestor
- **THEN** an error is thrown at runtime

### Requirement: authApi provides shared auth API methods
`authApi` SHALL expose `login`, `logout`, `me`, and `forgot` methods that call the shared `/api/auth/*` backend endpoints using `credentials: 'include'`. The `me()` method SHALL return `{ userId, displayName, email }`.

#### Scenario: login posts credentials
- **WHEN** `authApi.login(email, password)` is called
- **THEN** a POST request is sent to `/api/auth/login` with the credentials and the session cookie is set on success

#### Scenario: logout posts to logout endpoint
- **WHEN** `authApi.logout()` is called
- **THEN** a POST request is sent to `/api/auth/logout`

#### Scenario: me returns current user info including email
- **WHEN** `authApi.me()` is called with a valid session
- **THEN** the response contains `{ userId, displayName, email }`

#### Scenario: forgot logs attempt server-side
- **WHEN** `authApi.forgot()` is called
- **THEN** a POST request is sent to `/api/auth/forgot` and a message string is returned

## ADDED Requirements

### Requirement: Shared auth package exports UserChip
The `@repo/auth` package SHALL export a `UserChip` component alongside existing auth primitives.

#### Scenario: Client imports UserChip from @repo/auth
- **WHEN** a frontend client imports `UserChip` from `@repo/auth`
- **THEN** the symbol resolves without errors and the client builds successfully
