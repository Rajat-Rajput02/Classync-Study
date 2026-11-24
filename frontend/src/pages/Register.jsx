
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../services/authService";

const Register = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.password.length < 6) {
      setError("Password must contain at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      await registerUser(form);
      navigate("/login", {
        state: { message: "Registration successful. Please log in." },
      });
    } catch (err) {
      setError(
        err.response?.data?.message || "Registration failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="text-center text-3xl font-bold text-blue-700">
          Join Classync Study
        </h1>

        <p className="mb-8 mt-2 text-center text-gray-500">
          Create your student account
        </p>

        {error && (
          <p className="mb-4 rounded-lg bg-red-100 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Full name"
            required
            value={form.name}
            onChange={(e) =>
              setForm({ ...form, name: e.target.value })
            }
            className="w-full rounded-lg border border-gray-300 px-4 py-3"
          />

          <input
            type="email"
            placeholder="Email address"
            required
            value={form.email}
            onChange={(e) =>
              setForm({ ...form, email: e.target.value })
            }
            className="w-full rounded-lg border border-gray-300 px-4 py-3"
          />

          <input
            type="password"
            placeholder="Password (minimum 6 characters)"
            required
            value={form.password}
            onChange={(e) =>
              setForm({ ...form, password: e.target.value })
            }
            className="w-full rounded-lg border border-gray-300 px-4 py-3"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Register"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Already registered?{" "}
          <Link
            to="/login"
            className="font-semibold text-blue-600"
          >
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
