import './App.css'
import {
  TranscribeStreamingClient,
  StartStreamTranscriptionCommand,
} from "@aws-sdk/client-transcribe-streaming";
import MicrophoneStream from "microphone-stream"



export const startRecording = async ({ micStream, setSentence }: { micStream: MicrophoneStream, setSentence: (sentence: string) => void }) => {


  const client = new TranscribeStreamingClient({
    region: "ap-northeast-1",
    credentials: {
      accessKeyId: localStorage.getItem("accessKeyId") || "",
      secretAccessKey: localStorage.getItem("secretKey") || ""
    }
  });

  // this part should be put into an async function
  micStream.setStream(
    await window.navigator.mediaDevices.getUserMedia({
      video: false,
      audio: true,
    })
  );
  const audioStream = async function* () {
    for await (const chunk of micStream) {
      yield { AudioEvent: { AudioChunk: pcmEncodeChunk(chunk) /* pcm Encoding is optional depending on the source */ } };
    }
  };


  const command = new StartStreamTranscriptionCommand({
    // The language code for the input audio. Valid values are en-GB, en-US, es-US, fr-CA, and fr-FR
    LanguageCode: "en-US",
    // The encoding used for the input audio. The only valid value is pcm.
    MediaEncoding: "pcm",
    // The sample rate of the input audio in Hertz. We suggest that you use 8000 Hz for low-quality audio and 16000 Hz for
    // high-quality audio. The sample rate must match the sample rate in the audio file.
    MediaSampleRateHertz: 44100,
    AudioStream: audioStream(),
  });
  const response = await client.send(command);

  let sentence = ""
  let lastText = ""
  for await (const event of response.TranscriptResultStream!) {
    if (event.TranscriptEvent === undefined) {
      console.warn("event.TranscriptEventがundefinedです")
      continue
    }
    const message = event.TranscriptEvent;
    if (message === undefined) {
      console.warn("messageがundefinedです")
      continue
    }
    // Get multiple possible results
    const results = message.Transcript!.Results;
    if (results === undefined) {
      console.warn("resultsがundefinedです")
      continue
    }
    // Print all the possible transcripts
    results.forEach((result) => {
      (result.Alternatives || []).forEach((alternative) => {
        if (alternative.Transcript === undefined) {
          console.warn("alternative.Transcriptがundefinedです")
          return
        }
        console.warn(alternative.Transcript)
        console.log({ result })

        const isTextEnd = result.IsPartial === false
        if (isTextEnd) {
          // センテンスが変わった場合
          sentence += " " + alternative.Transcript
          setSentence(sentence)
          console.log("sentence: " + sentence)
          lastText = ""
        } else {
          lastText = alternative.Transcript
          setSentence(sentence + lastText)
          console.log("lastText: " + lastText)
        }
      });
    });
  }
}

// export const Listen = (props: {}) => {


//   useEffect(() => {
//     props.onGetPartialSentence(sentence)
//   }, [sentence])

//   return (
//     <>
//       <div>
//         <button onClick={() => startRecording({ micStream, setSentence })}>start</button>
//         <p>{sentence}</p>
//         <button onClick={() => {
//           micStream.stop()
//           setMicStream(new MicrophoneStream())
//         }}>stop</button>
//       </div>
//     </>
//   )
// }



const pcmEncodeChunk = (chunk: Buffer) => {
  const input = MicrophoneStream.toRaw(chunk);
  var offset = 0;
  var buffer = new ArrayBuffer(input.length * 2);
  var view = new DataView(buffer);
  for (var i = 0; i < input.length; i++, offset += 2) {
    var s = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return Buffer.from(buffer);
};