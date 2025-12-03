// src/components/ui/masked-input.tsx
import React from 'react';
import InputMask from 'react-input-mask';
import { Input } from './input';

interface MaskedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    mask: string;
}

export const MaskedInput = React.forwardRef<HTMLInputElement, MaskedInputProps>(
    ({ mask, ...props }, ref) => {
        return (
            <InputMask mask={mask} {...props}>
                {(inputProps: any) => <Input {...inputProps} ref={ref} />}
            </InputMask>
        );
    }
);

MaskedInput.displayName = 'MaskedInput';
