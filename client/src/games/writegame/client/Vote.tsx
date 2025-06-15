import { useAtom } from "jotai";
import type { SendJsonMessage } from "react-use-websocket/dist/lib/types";
import {
  castVote,
  voteId,
  voteOptions,
  voteOptionSelectedCount,
  voteOptionsSelected,
  voteTitle,
  voteType,
} from "../../../state/VoteState";
import {
  Button,
  Grid,
  GridColumn,
  GridRow,
  List,
  ListContent,
  ListItem,
} from "semantic-ui-react";
import { userId } from "../../../state/UserState";

interface VoteProps {
  sendJsonMessage: SendJsonMessage;
}

const Vote = (props: VoteProps) => {
  const [_voteId] = useAtom(voteId);
  const [_voteTitle] = useAtom(voteTitle);
  const [_options] = useAtom(voteOptions);
  const [_voteType] = useAtom(voteType);
  const [_voteOptionSelectedCount] = useAtom(voteOptionSelectedCount);
  const [_voteOptionsSelected] = useAtom(voteOptionsSelected);
  const [_userId] = useAtom(userId);

  if (!_voteId) {
    return <p>No vote!</p>;
  }

  const selectVoteOption = (optionId: string) => {
    castVote(props.sendJsonMessage, _voteId || "", optionId);
  };

  const canVote =
    _voteType == "Single"
      ? _voteOptionSelectedCount < 1
      : _voteOptionSelectedCount < Math.min(_options.length, 3);

  return (
    <Grid centered>
      <GridRow>
        <GridColumn width={4} style={{ textAlign: "center" }}>
          <p>{canVote ? _voteTitle : "Waiting"}</p>
          <List relaxed="very">
            {canVote
              ? _options
                  .filter(
                    (o) =>
                      !_voteOptionsSelected[o.id] && o.exclude_user != _userId
                  )
                  .map((option) => {
                    const optionId = option.id;
                    return (
                      <ListItem key={"option-" + optionId}>
                        <ListContent>
                          <Button onClick={() => selectVoteOption(optionId)}>
                            {option.content.text}
                          </Button>
                        </ListContent>
                      </ListItem>
                    );
                  })
              : []}
          </List>
        </GridColumn>
      </GridRow>
    </Grid>
  );
};

export default Vote;
