export default function Footer() {
  return (
    <div className="sidebar-footer">
      <div className="footer-brand">
        <span>Prime Gourmet</span>
        <small>Inter Branch Transfers Management System</small>
      </div>

      <div className="footer-developer">
        Developed by{" "}
        <a
          href="https://www.linkedin.com/in/sadar-ullah"
          target="_blank"
          rel="noopener noreferrer"
        >
          Sadar Ullah Khan
        </a>
      </div>

      <div className="footer-contact">
        <a href="mailto:khanwebmaster4@gmail.com">
          khanwebmaster4@gmail.com
        </a>

        <a
          href="https://wa.me/923322649000"
          target="_blank"
          rel="noopener noreferrer"
        >
          WhatsApp: +923322649000
        </a>
      </div>

      <div className="footer-copyright">
        © 2026 Prime Gourmet · All rights reserved.
      </div>
    </div>
  );
}