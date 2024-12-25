import { ActionIcon, Button, Modal, Select, Textarea } from '@mantine/core';
import { useState } from 'react';
import { useDisclosure } from '@mantine/hooks';

export type Setting = {
  situation: string
  speechSpeed: number
}

export const Setting = (props: { currentSetting: Setting, onSaveSetting: (setting: Setting) => void }) => {
  const [opened, { open, close }] = useDisclosure(false);

  return <div style={{ position: "absolute", top: 0, left: 0 }}>
    <div style={{ padding: "8px" }}>
      <ActionIcon size="lg" variant='default' aria-label="Settings" onClick={() => open()}>
        ⚙️
      </ActionIcon>
      <Modal opened={opened} onClose={close} title="設定" centered>
        <SettingInner currentSetting={props.currentSetting} onSaveSetting={props.onSaveSetting} onClose={close} />
      </Modal>
    </div>
  </div>
}

const SettingInner = (props: { currentSetting: Setting, onSaveSetting: (setting: Setting) => void, onClose: () => void }) => {

  const [setting, setSetting] = useState<Setting>(props.currentSetting)

  return <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
    <Textarea
      label="シチュエーション"
      description="会話のシチュエーション"
      placeholder="あなたは友人とラスベガスに旅行に行ってます"
      autosize
      value={setting.situation}
      onChange={(event) => {
        setSetting({
          ...setting,
          situation: event.currentTarget.value
        })
      }}
    />


    <Select
      label="発音速度"
      value={"" + setting.speechSpeed}
      data={['0.2', '0.3', '0.4', '0.5', '0.6', '0.7', '0.8', '0.9', '1']}
      onChange={(_value, _option) => {
        if (_value === null) return
        setSetting({
          ...setting,
          speechSpeed: parseFloat(_value)
        })
      }}
    />

    <Button fullWidth variant="filled" onClick={() => {
      props.onSaveSetting(setting)
      props.onClose()
    }}>Save</Button>
  </div>
}
