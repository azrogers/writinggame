import { useAtom } from "jotai";
import type { SendJsonMessage } from "react-use-websocket/dist/lib/types";
import {
  castVote,
  voteId,
  voteOptions,
  voteOptionSelectedCount,
  voteTitle,
  voteType,
} from "../../../state/VoteState";
import { Button, List, ListContent, ListItem } from "semantic-ui-react";

interface VoteProps {
  sendJsonMessage: SendJsonMessage;
}

const Vote = (props: VoteProps) => {
  const [_voteId] = useAtom(voteId);
  const [_voteTitle] = useAtom(voteTitle);
  const [_options] = useAtom(voteOptions);
  const [_voteType] = useAtom(voteType);
  const [_voteOptionSelectedCount] = useAtom(voteOptionSelectedCount);

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
    <div>
      <p>{canVote ? _voteTitle : "Waiting"}</p>
      <List relaxed="very">
        {canVote
          ? _options.map((option) => {
              const optionId = option.id;
              return (
                <ListItem key={"option-" + optionId}>
                  <ListContent>
                    <Button onClick={() => selectVoteOption(optionId)}>
                      {option.text}
                    </Button>
                  </ListContent>
                </ListItem>
              );
            })
          : []}
      </List>
    </div>
  );
};

export default Vote;
