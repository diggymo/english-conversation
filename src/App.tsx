import { useState } from 'react';
import { Chat, Message, VoiceStream } from './Chat';
import { Setting } from './Setting';

const App = () => {

  const [messages, setMessages] = useState<Message[]>(sampleMessages)
  const [setting, setSetting] = useState({ situation: "あなたはユーザーの友達で、アメリカに住んでいます。あなたはラスベガスの空港でユーザーを出迎えて、ご飯やホテルやカジノなどを説明し、ユーザーと一緒にどこかに出かけないかと提案します。", speechSpeed: 1.0 })

  return <>
    <div>
    
      <Setting currentSetting={setting} onSaveSetting={(s) => setSetting(s)}/>
    </div>
    <Chat setting={setting} messages={messages} reset={(index) => {
      console.log({ index });
      setMessages(messages.slice(0, index));
    }} onAddMessage={(message: Message) => {
      setMessages((_messages) => {
        return [..._messages, message]
      });
    }} onConcatSystemMessage={(message: string, input: number, output: number) => {
      setMessages((messages) => {
        const last = messages[messages.length - 1]
        if (last.sender === "user") {
          console.warn("userが連続しています")
          return messages
        }

        last.message += (" " + message);
        last.chatToken = {
          input: last.chatToken.input + input,
          output: last.chatToken.output + output
        }

        messages[messages.length - 1] = last

        return messages
      })
    }
    }

      onSetVoiceStream={(stream: VoiceStream) => {
        setMessages((messages) => {
          const last = messages[messages.length - 1]
          if (last.sender === "user") {
            console.warn("userが連続しています")
            return messages
          }

          last.voiceStream = stream;
          messages[messages.length - 1] = last

          return messages
        })
      }}
    />
  </>

}

export default App





const sampleMessages: Message[] = [
  // {
  //   "sender": "system",
  //   "message": "こんにちはこんにちはこんにちはこんにちはこんにちはこんにちはこんにちはこんにちはこんにちはこんにちはこんにちは",
  //   "chatToken": {
  //     "input": 0,
  //     "output": 0
  //   },
  //   "voiceStream": undefined
  // }
]