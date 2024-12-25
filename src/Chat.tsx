import { ActionIcon, Button } from '@mantine/core';
import { useEffect, useRef, useState } from 'react';
import { Loader } from '@mantine/core';
import { startRecording } from './Listen';
import MicrophoneStream from 'microphone-stream';

import { BedrockRuntimeClient, InvokeModelCommand, ConverseCommand } from "@aws-sdk/client-bedrock-runtime"
import { play } from './speechToText';
import { Setting } from './Setting';

export type MessageFromUser = {
  sender: "user"
  message: string;
  rawMessage: string
  guide?: string,

  guideToken?: {
    input: number,
    output: number
  }
}

export type VoiceStream = Uint8Array

export type MessageFromSystem = {
  sender: "system"
  message: string;
  chatToken: {
    input: number,
    output: number
  },
  voiceStream?: VoiceStream
}

export type Message = MessageFromUser | MessageFromSystem

const getGuideResponse = async (userInput: string) => {
  const client = new BedrockRuntimeClient({
    region: "ap-northeast-1",
    credentials: {
      accessKeyId: localStorage.getItem("accessKeyId") || "",
      secretAccessKey: localStorage.getItem("secretKey") || ""
    }
  })

  // Create a command with the model ID, the message, and a basic configuration.
  const command = new ConverseCommand({
    modelId: "anthropic.claude-3-haiku-20240307-v1:0",
    messages: [
      {
        role: "user",
        content: [{ text: `${userInput}` }],
      },
    ],
    inferenceConfig: { maxTokens: 1024, temperature: 0.5, topP: 0.9 },
    toolConfig: {
      tools: [{
        toolSpec: {
          name: "English_conversation_teacher",
          "description": `
You are an excellent English conversation teacher.
You will receive the English words uttered by English conversation students.
Please pay attention to grammar, word usage, and phrasing, and output natural and correct English for oral conversation.
Also, explain in Japanese which parts have changed and how, giving specific reasons for their changes. Please make sure to explain in Japanese.
However, Don't explain symbols such as periods, or singular, plural, past tense, or transition words such as "um", "er", or "uh".
Do not output "changes" to parts that have not changed.
No preamble or summary needed.
`,
          "inputSchema": {
            "json": {
              "type": "object",
              "properties": {
                "naturalAndCorrectEnglishSentences": {
                  "type": "string",
                  "description": "Natural and correct English sentences",
                },
                "changes": {
                  "type": "string",
                  "description": "Changes made from the original text (Japanese explanation)",
                },
              },
              "required": ["naturalAndCorrectEnglishSentences", "changes"],
            }
          },
        },
      }],
      toolChoice: {
        tool: {
          name: "English_conversation_teacher"
        }
      }
    }
  });

  for (let i = 0; i < 3; i++) {
    try {
      const apiResponse = await client.send(command);

      console.log({ apiResponse })
      console.log(apiResponse.output?.message?.content)
      console.log("HOOOOO2!!")
      return apiResponse
    } catch (e) {
      if ((e as Error).name !== "ThrottlingException") {
        throw e
      }
      await new Promise((resolve) => setTimeout(resolve, 5000))
    }
  }

  throw new Error("リトライ回数を超えました")
}


const getSystemMessage = async (situation: string, messages: Message[], _onConcatSystemMessage: (message: string, input: number, output: number) => void) => {
  const client = new BedrockRuntimeClient({
    region: "ap-northeast-1",
    credentials: {
      accessKeyId: localStorage.getItem("accessKeyId") || "",
      secretAccessKey: localStorage.getItem("secretKey") || ""
    }
  })


  const payloadMessages = [
    {
      role: "user",
      content: [{
        type: "text", text: `You are an excellent English teacher.
      Receive English words spoken by your English students.
      There may be problems with grammar, usage, and phrasing, but please understand the intention and output a reply in English according to the given situation.
      Also, within the given situation, talk deeply about one theme and change the topic appropriately. Do not ask too many questions, but encourage the other person to ask you questions.
      The situations are given in Japanese below.

      Please answer in about 20 words and use words that a junior high school student can understand.
      But do not answer in narrative text.
      -------
      
      ${situation}`
      }],
    },
  ]
  payloadMessages.push(...messages.map((message) => {
    if (message.sender === "user") {
      return {
        role: "user",
        content: [{ type: "text", text: message.message }],
      }
    }

    return {
      role: "assistant",
      content: [{ type: "text", text: message.message }],
    }
  }))

  const payload = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 1024,
    messages: payloadMessages,
  };


  for (let i = 0; i < 5; i++) {
    try {
      const command = new InvokeModelCommand({
        contentType: "application/json",
        body: JSON.stringify(payload),
        modelId: "anthropic.claude-3-5-sonnet-20240620-v1:0",
      });
      const apiResponse = await client.send(command);

      const decodedResponseBody = new TextDecoder().decode(apiResponse.body);
      /** @type {MessagesResponseBody} */
      const responseBody = JSON.parse(decodedResponseBody);

      return { message: responseBody.content[0].text, input: responseBody.usage.input_tokens, output: responseBody.usage.output_tokens }
    } catch(err) {
      console.error(err)
      await new Promise((resolve) => setTimeout(resolve, 5000))
    }
  }

  throw new Error("リトライ回数を超えました")
}


export const Chat = (props: { messages: Message[], reset: (index: number) => void, onSetVoiceStream: (voiceStream: VoiceStream) => void, onAddMessage: (message: Message) => void, onConcatSystemMessage: (message: string, input: number, output: number) => void, setting: Setting }) => {

  const [status, setStatus] = useState<{ type: "loading" } | { type: "recording", recordingMessage: string } | { type: "waiting" }>({ type: "waiting" })

  return (
    <div style={{ height: "100vh", paddingTop: "24px",flexShrink: 1 }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        padding: "12px",
        overflowY: "scroll",

      }}>
        {props.messages.map((message, index) => message.sender === 'user' ? <UserMessage key={index} message={message} reset={() => {
          setStatus({ type: "waiting" })
          props.reset(index)
        }} /> : <SystemMessage key={index} message={message} setting={props.setting}/>)}

        {status.type === "recording" && status.recordingMessage && <div style={{ display: "flex", justifyContent: "right" }}>
          <span style={{
            background: '#559fbf',
            color: 'white',
            padding: '8px',
            justifyContent: "left",
            borderRadius: '10px',
            display: 'inline-block',
            maxWidth: "300px",
            whiteSpace: "pre-wrap"
          }}>
            {status.recordingMessage}
          </span></div>}
      </div>

      <div style={{
        minHeight: "100px",
        backgroundColor: "#eee",
        display: "grid", placeItems: "center"
      }}>
        {status.type === "waiting" && <div style={{}}>
          <Button variant="outline" onClick={() => {
            setStatus({ type: "recording", recordingMessage: "" })
          }}>
            🎤
          </Button>
        </div>}
        {status.type === "recording" && <div style={{ display: "flex", justifyContent: "center", gap: "16px" }}>
          <Recorder onGetPartialSentence={(sentence) => {
            setStatus({ type: "recording", recordingMessage: sentence })
          }} onStop={async (isAbort) => {

            if (isAbort) {
              setStatus({ type: "waiting" })
              return
            }

            // bedrockに送信
            const sentence = status.recordingMessage
            setStatus({ type: "loading" })

            const response = await getGuideResponse(sentence)

            const responseData = response.output?.message?.content?.at(0) as any

            const newMessage: MessageFromUser = {
              sender: "user",
              message: responseData.toolUse.input.naturalAndCorrectEnglishSentences,
              rawMessage: sentence,
              guideToken: {
                input: response.usage?.inputTokens || 0,
                output: response.usage?.outputTokens || 0
              },
              guide: responseData.toolUse.input.changes
            }
            const currentMessage = props.messages.slice()
            props.onAddMessage(newMessage)


            try {
              const { message, input, output } = await getSystemMessage(props.setting.situation, currentMessage.concat(newMessage), props.onConcatSystemMessage)
              props.onAddMessage({
                sender: "system",
                message: message,
                chatToken: {
                  input: input,
                  output: output
                },
              })
  
              setStatus({ type: "waiting" })

              const byteArray = await play(message)
              props.onSetVoiceStream(byteArray)
            
            } catch(e) {
              setStatus({ type: "waiting" })
              alert("エラーが発生しました、時間をおいて再度お試しください")
            } 
            
          }} />
        </div>}
        {status.type === "loading" && <div style={{ display: "grid", placeItems: "center" }}>
          <Loader />
        </div>}
      </div>

    </div>
  );
};

const Recorder = (props: { onGetPartialSentence: (sentence: string) => void, onStop: (isAbort: boolean) => void }) => {
  const [micStream, _setMicStream] = useState<MicrophoneStream>(new MicrophoneStream())

  useEffect(() => {
    startRecording({ micStream, setSentence: props.onGetPartialSentence })
  }, [])

  return <>
    <Button variant="outline" onClick={() => {
      micStream.stop()
      // props.setStatus("loading")
      props.onStop(false)

    }}>
      ✅
    </Button>
    <Button variant="outline" onClick={() => {
      micStream.stop()
      // props.setStatus("waiting")
      props.onStop(true)
    }}>
      ❌
    </Button>
  </>
}





const UserMessage = ({ message, reset }: { message: MessageFromUser, reset: () => void }) => {
  const [isShowGuide, setIsShowGuide] = useState(false)
  const [isShowRawMessage, setIsShowRawMessage] = useState(false)
  return <div style={{ paddingBottom: '10px', }}>
    <div
      style={{
        display: "flex",
        gap: "8px",
        justifyContent: "right",
      }}
    >
      <ActionIcon size="lg" variant='default' aria-label="Settings" onClick={() => setIsShowGuide(!isShowGuide)}>
        💬
      </ActionIcon>
      <ActionIcon size="lg" variant='default' aria-label="Settings" onClick={() => {
        if (!window.confirm("リセットして良い？")) return
        reset()
      }}>
        ✍️
      </ActionIcon>
      <span style={{
        background: '#559fbf',
        color: 'white',
        padding: '8px',
        borderRadius: '10px',
        display: 'inline-block',
        maxWidth: "300px",
        whiteSpace: "pre-wrap",
      }}
        onClick={() => setIsShowRawMessage(!isShowRawMessage)}>
        {isShowRawMessage ? ("🗣️ " + message.rawMessage) : message.message}
      </span>
    </div>
    {isShowGuide &&
      <div style={{
        paddingTop: '5px',
        display: "flex",
        justifyContent: "right",
      }}>
        <span style={{
          color: 'black',
          padding: '8px',
          fontSize: "0.8rem",
          border: "1px solid #ddd",
          borderRadius: '10px',
          display: 'inline-block',
          maxWidth: "300px",
          whiteSpace: "pre-wrap",
        }}>
          {message.guide}
        </span>
      </div>
    }
  </div>
}


const SystemMessage = ({ message, setting }: { message: MessageFromSystem,setting: Setting }) => {
  const ref = useRef<HTMLAudioElement>(null);
  const [isDisplaySoundControl, setIsDisplaySoundControl] = useState(true)

  useEffect(() => {
    const hoge = async () => {
      console.log("set audio")
      // まだ音声が設定されていない場合のみ
      if (!(ref.current!.src) && message.voiceStream !== undefined) {
        var blob = new Blob([message.voiceStream!], { type: 'audio/mp3' });
        var url = window.URL.createObjectURL(blob)
        ref.current!.src = url;
        console.log("speed", setting.speechSpeed)
        ref.current!.playbackRate = setting.speechSpeed
        ref.current!.play();
      }
    }
    hoge()
  }, [message.voiceStream])

  return <div style={{
    paddingBottom: '10px',
  }}>
    <div
      style={{
        display: "flex",
        gap: "8px",
        justifyContent: "left",
      }}
    >
      <span style={{
        background: '#f1f0f0',
        color: 'black',
        padding: '5px 10px',
        borderRadius: '10px',
        display: 'inline-block',
        maxWidth: "300px",
        whiteSpace: "pre-wrap"
      }}>
        {message.message}
      </span>
      <ActionIcon size="lg" variant='default' aria-label="Settings" onClick={() => {
        setIsDisplaySoundControl(!isDisplaySoundControl)
      }}>
        🔊
      </ActionIcon>
      
    </div>
    <audio ref={ref} controls autoPlay style={{ visibility: isDisplaySoundControl ? "visible" : "hidden", height: isDisplaySoundControl ? undefined : "1px", paddingTop: "8px" }} />
  </div>
}