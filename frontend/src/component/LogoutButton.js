export default function LogoutButton() {
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("fullName");
    window.location.href = "/login";
  };

  return <button onClick={handleLogout}>Logout</button>;
}
