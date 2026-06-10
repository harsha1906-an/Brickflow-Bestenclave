import { Select, Tag } from 'antd';
import { nanoid as uniqueId } from 'nanoid';

export default function SelectTag({ options, defaultValue }) {
  return (
    <Select
      defaultValue={defaultValue}
      style={{
        width: '100%',
      }}
    >
      {options?.map((value) => {
        if (option)
          return (
            <Select.Option key={`${uniqueId()}`} value={option.value}>
              {translate(option.label)}
            </Select.Option>
          );
        else
          return (
            <Select.Option key={`${uniqueId()}`} value={value}>
              {value}
            </Select.Option>
          );
      })}
    </Select>
  );
}
