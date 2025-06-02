import { Formik } from "formik";
import type { SendJsonMessage } from "react-use-websocket/dist/lib/types";
import { Button, Form, FormField, Input } from "semantic-ui-react";
import { joinGame } from "../state/UserState";
import {
  checkGame,
  checkGameInfo,
  creatingGame,
  gameTypeToString,
  hostGame,
} from "../state/GameState";
import { useAtom } from "jotai";
import { Store } from "../state/Store";

const JOIN_CODE_LEN = 5;

interface JoinPageProps {
  sendJsonMessage: SendJsonMessage;
}

const JoinPage = (props: JoinPageProps): React.ReactElement => {
  const [_creatingGame, setCreatingGame] = useAtom(creatingGame);
  const [_checkGameInfo] = useAtom(checkGameInfo);

  let checkGameInfoText = <p></p>;
  if (_checkGameInfo === false) {
    checkGameInfoText = <p>Game not found.</p>;
  } else if (_checkGameInfo && _checkGameInfo !== true) {
    checkGameInfoText = <p>{gameTypeToString(_checkGameInfo.game_type)}</p>;
  }

  return (
    <>
      <Button
        onClick={() => {
          setCreatingGame(true);
          hostGame(props.sendJsonMessage);
        }}
        disabled={_creatingGame}>
        Host Game
      </Button>
      <Formik
        initialValues={{ joinCode: "", name: "" }}
        validate={(values) => {
          const errors: { [name: string]: string | undefined } = {};
          if (!values.joinCode) {
            errors.joinCode = "Required";
          } else if (values.joinCode.length != JOIN_CODE_LEN) {
            errors.joinCode = "Join code should be five characters long.";
          }

          if (!values.name) {
            errors.name = "Required";
          } else if (values.name.length > 16) {
            errors.name =
              "Name should be between 1 and 16 characters in length.";
          }

          return errors;
        }}
        onSubmit={(values, { setSubmitting }) => {
          joinGame(props.sendJsonMessage, values.joinCode, values.name).then(
            () => {
              setSubmitting(false);
            }
          );
        }}>
        {({
          values,
          errors,
          touched,
          handleChange,
          handleBlur,
          handleSubmit,
          isSubmitting,
        }) => (
          <Form onSubmit={handleSubmit}>
            <FormField
              name="joinCode"
              label="Join Code"
              onChange={(e: React.ChangeEvent<any>) => {
                handleChange(e);
                const code = e.target.value as string;
                if (code.length == JOIN_CODE_LEN) {
                  checkGame(props.sendJsonMessage, code);
                } else {
                  Store.set(checkGameInfo, null);
                }
              }}
              onBlur={handleBlur}
              value={values.joinCode}
              control={Input}
              placeholder="Join Code"
              error={
                errors.joinCode &&
                touched.joinCode && {
                  content: errors.joinCode,
                  pointing: "above",
                }
              }
            />
            {checkGameInfoText}
            <FormField
              name="name"
              label="Name"
              onChange={handleChange}
              onBlur={handleBlur}
              value={values.name}
              control={Input}
              placeholder="Name"
              error={
                errors.name &&
                touched.name && {
                  content: errors.name,
                  pointing: "above",
                }
              }
            />
            <FormField
              control={Button}
              type="Submit"
              disabled={isSubmitting || _creatingGame}
              content="Join"
            />
          </Form>
        )}
      </Formik>
    </>
  );
};

export default JoinPage;
