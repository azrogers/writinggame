import { getNameColor } from "../../../lib/util";

interface UsernameProps {
  username: string | null;
}

const Username = (props: UsernameProps) => {
  return (
    <span
      className="username"
      style={{ color: getNameColor(props.username || "") }}>
      {props.username}
    </span>
  );
};

export default Username;
