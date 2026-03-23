# FALCON Connect Dashboard

This is the dashboard for the FALCON Connect service.
It is the place where users can manage their connections they set up in the FALCON and FALCON-supported applications.

## Short: What is FALCON Connect?

With FALCON Connect, app developers (during the early alpha, only FALCON-supported applications that the team behind FALCON controls) can implement service integration.
That means, when two distinct applications want to exchange data, they can use FALCON Connect to "install" the other apps.

**Important**: FALCON Connect _does not_ manage the actual data exchange. It only provides the infrastructure to enable the exchange.

## Example Flow

This flow shows how FALCON Connect conceptually works. Assume that user in application A wants to enable the app to read data from application B.

1. User goes to app A's settings page and sees "Connect App B"
2. They click on "Connect"
3. They are redirected to app B at a specific URL (e.g. https://app-b.com/falcon/connect-request?app-a=https://app-a.com&app-a-pubkey=...)
4. Next steps depends on the sign in state:
   - If the user is not signed in, they are redirected to the sign in page. After signing in, they go to the next step.
   - If the user is signed in, they go to the next step directly.
5. User confirms the installation of this integration (or denies it). They see the capabilities/scopes that app A has requested from app B
6. They are redirected to app A's settings page
7. They see that the connection is established (or not)

This is only a high level flow, and might work a little different in some small edge cases. Also, it might be extended in the future.

Now, the apps can communicate with each other. During the installation and connection process, app B told app A the base URL of the endpoint to communicate with.
This base URL is completely independent from the FALCON Connect infrastructure. It is only a convenience for exchanging basic information between the apps.

---

This is a Tanstack Start application generated with
[Create Fumadocs](https://github.com/fuma-nama/fumadocs).

---

Run development server:
