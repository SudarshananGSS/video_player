import { login, signup } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Sign in</h1>
          <p className="text-sm text-neutral-500">
            Manage and share your video &amp; image library.
          </p>
        </div>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
        {message && (
          <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{message}</p>
        )}

        <form className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              formAction={login}
              className="flex-1 rounded-md bg-black px-3 py-2 text-sm font-medium text-white"
            >
              Log in
            </button>
            <button
              formAction={signup}
              className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium"
            >
              Sign up
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
