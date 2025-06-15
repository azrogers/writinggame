import { useAtom } from "jotai";
import type React from "react";
import {
  Grid,
  GridColumn,
  Header,
  List,
  ListContent,
  ListHeader,
  ListItem,
} from "semantic-ui-react";
import { gameUsers, joinCode } from "../../../state/GameState";
import { useEffect } from "react";
import { Data } from "../Data";
import Username from "../components/Username";
import UserIcon from "../components/UserIcon";

const Lobby = (): React.ReactElement => {
  const [_joinCode] = useAtom(joinCode);
  const [users] = useAtom(gameUsers);

  useEffect(() => {
    Data.preload();
  }, []);

  return (
    <>
      <Grid>
        <GridColumn width={2}>
          <Header size="tiny" style={{ marginBottom: 0 }}>
            Join Code
          </Header>
          <Header size="large" style={{ marginTop: 0 }}>
            {_joinCode}
          </Header>
        </GridColumn>
        <GridColumn width={6}>
          <List relaxed>
            {users.map((u) => {
              return (
                <ListItem className="user-list-item" key={"user-" + u.id}>
                  <UserIcon user={u} />
                  <ListContent>
                    <ListHeader>
                      <Username username={u.name} />
                    </ListHeader>
                  </ListContent>
                </ListItem>
              );
            })}
          </List>
        </GridColumn>
      </Grid>
    </>
  );
};

export default Lobby;
