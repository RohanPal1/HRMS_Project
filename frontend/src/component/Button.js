export default function Button({ children, ...props }) {
    return (
        <button
            {...props}
            style={{
                padding: "8px 14px",
                border: "none",
                background: "#007bff",
                color: "white",
                cursor: "pointer"
            }}
        >
            {children}
        </button>
    );
}
