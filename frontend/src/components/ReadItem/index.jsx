import { useEffect, useState } from 'react';
import { Row, Col } from 'antd';
import { useSelector } from 'react-redux';

import dayjs from 'dayjs';
import { dataForRead } from '@/utils/dataStructure';

import { useCrudContext } from '@/context/crud';
import { selectCurrentItem } from '@/redux/crud/selectors';
import { valueByString } from '@/utils/helpers';

import useLanguage from '@/locale/useLanguage';
import { useDate } from '@/settings';

export default function ReadItem({ config }) {
  const { dateFormat } = useDate();
  let { readColumns, fields } = config;
  const translate = useLanguage();
  const { result: currentResult } = useSelector(selectCurrentItem);
  const { state } = useCrudContext();
  const { isReadBoxOpen } = state;
  const [listState, setListState] = useState([]);

  if (fields) readColumns = [...dataForRead({ fields: fields, translate: translate })];
  useEffect(() => {
    const list = [];
    if (currentResult) {
      readColumns.map((props) => {
        const propsKey = props.dataIndex;
        const propsTitle = props.title;
        const isDate = props.isDate || false;
        let value = valueByString(currentResult, propsKey);
        if (props.render) {
          value = props.render(value, currentResult);
        } else {
          value = isDate ? (value ? dayjs(value).format(dateFormat) : '') : value;
        }
        list.push({ propsKey, label: propsTitle, value: value });
      });
    }
    setListState(list);
  }, [currentResult, readColumns, dateFormat]);

  const show = isReadBoxOpen ? { display: 'block', opacity: 1 } : { display: 'none', opacity: 0 };

  const itemsList = listState.map((item) => {
    return (
      <Row key={item.propsKey} gutter={12}>
        <Col className="gutter-row" span={8}>
          <div style={{ margin: '1em 0' }}>{item.label}</div>
        </Col>
        <Col className="gutter-row" span={2}>
          <div style={{ margin: '1em 0' }}> : </div>
        </Col>
        <Col className="gutter-row" span={14}>
          <div style={{ margin: '1em 0' }}>{item.value}</div>
        </Col>
      </Row>
    );
  });

  return <div style={show}>{itemsList}</div>;
}
