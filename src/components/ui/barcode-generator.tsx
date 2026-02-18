'use client'

import React from 'react'
import Barcode from 'react-barcode'

interface BarcodeGeneratorProps {
    value: string
    width?: number
    height?: number
    fontSize?: number
    displayValue?: boolean
}

export const BarcodeGenerator = ({ value, width = 2, height = 100, fontSize = 20, displayValue = true }: BarcodeGeneratorProps) => {
    return (
        <Barcode
            value={value}
            width={width}
            height={height}
            fontSize={fontSize}
            displayValue={displayValue}
        />
    )
}
