import { Link } from "react-router-dom";
const styles = {
  primary: "button button-primary",
  accent: "button button-accent",
  outline: "button button-outline",
};
export function Button({ variant = "primary", className = "", ...props }) {
  return <button className={`${styles[variant]} ${className}`} {...props}/>;
}
export function ButtonLink({ to, children, variant = "primary", className = "" }) {
  return <Link to={to} className={`${styles[variant]} ${className}`}>{children}</Link>;
}
