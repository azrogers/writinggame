import { Image } from "semantic-ui-react";
import { IconsManager } from "../../../data/IconsManager";
import type { GameUserState } from "../../../state/GameState";

interface UserIconProps {
  user: GameUserState;
}

const UserIcon = (props: UserIconProps) => {
  return (
    <Image
      ui
      avatar
      size="mini"
      src={IconsManager.getImageUrl(props.user.icon_id)}
      className="user-icon"
    />
  );
};

export default UserIcon;
