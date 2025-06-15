import { useAtom } from "jotai";
import type { SendJsonMessage } from "react-use-websocket/dist/lib/types";
import {
  promptId,
  promptSubmitted,
  promptTitle,
  promptType,
  submitPrompt,
} from "../../../state/PromptState";
import { useState } from "react";
import { Button, Form, TextArea } from "semantic-ui-react";

interface PromptProps {
  sendJsonMessage: SendJsonMessage;
}

const Prompt = (props: PromptProps) => {
  const [_promptId] = useAtom(promptId);
  const [_promptType] = useAtom(promptType);
  const [_promptTitle] = useAtom(promptTitle);
  const [_promptSubmitted, _setPromptSubmitted] = useAtom(promptSubmitted);

  const [promptText, setPromptText] = useState("");

  if (!_promptId) {
    return <p>No prompt!</p>;
  }

  const submitPromptClick = () => {
    submitPrompt(props.sendJsonMessage, _promptId, {
      type: "Text",
      text: promptText,
    });
    _setPromptSubmitted(true);
  };

  let promptInput = <></>;
  let canSubmit = false;
  if (!_promptSubmitted && _promptType.type == "Text") {
    promptInput = (
      <Form
        onSubmit={(e) => {
          console.log(e);
        }}>
        <TextArea
          value={promptText}
          maxLength={_promptType.maxLength}
          placeholder={"Text"}
          onKeyDown={(e: any) => {
            if (e.key == "Enter") {
              submitPromptClick();
              e.preventDefault();
            }
          }}
          onChange={(e) => {
            setPromptText(e.target.value);
          }}
          style={{ marginBottom: "5px" }}
        />
      </Form>
    );
    canSubmit =
      promptText.length >= _promptType.minLength &&
      promptText.length <= _promptType.maxLength;
  }

  return (
    <div>
      <p>{_promptSubmitted ? "Waiting" : _promptTitle}</p>
      <div>{promptInput}</div>
      <div>
        {_promptSubmitted ? (
          <></>
        ) : (
          <Button onClick={submitPromptClick} disabled={!canSubmit}>
            Submit
          </Button>
        )}
      </div>
    </div>
  );
};

export default Prompt;
