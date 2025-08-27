import { useState } from 'react';
import { Modal, TextInput, Button, Group, Text, NumberInput } from '@mantine/core';
import { Holding } from '@/types/portfolio';

interface ManualPriceInputProps {
  opened: boolean;
  onClose: () => void;
  holding: Holding | null;
  onSubmit: (symbol: string, price: number) => void;
}

export default function ManualPriceInput({ 
  opened, 
  onClose, 
  holding, 
  onSubmit 
}: ManualPriceInputProps) {
  const [price, setPrice] = useState<number | string>('');

  const handleSubmit = () => {
    if (holding && price && typeof price === 'number' && price > 0) {
      onSubmit(holding.symbol, price);
      setPrice('');
      onClose();
    }
  };

  const handleClose = () => {
    setPrice('');
    onClose();
  };

  if (!holding) return null;

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="手動輸入共同基金現值"
      centered
    >
      <div>
        <Text size="sm" c="dimmed" mb="md">
          由於共同基金價格無法自動獲取，請手動輸入最新的淨值。
        </Text>
        
        <Text size="sm" mb="xs">
          <strong>基金名稱：</strong>{holding.name}
        </Text>
        <Text size="sm" mb="xs">
          <strong>基金代碼：</strong>{holding.symbol}
        </Text>
        <Text size="sm" mb="xs">
          <strong>計價貨幣：</strong>{holding.currency}
        </Text>
        <Text size="sm" mb="md">
          <strong>持有數量：</strong>{holding.quantity}
        </Text>

        <NumberInput
          label="最新淨值"
          placeholder="請輸入最新的基金淨值"
          value={price}
          onChange={setPrice}
          min={0}
          decimalScale={2}
          step={0.01}
          mb="md"
          required
        />

        <Group justify="flex-end">
          <Button variant="light" onClick={handleClose}>
            取消
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!price || typeof price !== 'number' || price <= 0}
          >
            確認更新
          </Button>
        </Group>
      </div>
    </Modal>
  );
}

