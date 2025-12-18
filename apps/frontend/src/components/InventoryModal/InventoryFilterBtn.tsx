import Image from 'next/image';
import { Button } from "../shared/Button";
import { SmBtn } from './assets/sm-btn';

export interface IInventoryFilterBtnProps {
    isActiveFilter: boolean;
    title: string;
    imgSrc?: string;
    alt?: string;
    handleChangeFilter: () => void;
}

export default function InventoryFilterBtn({ isActiveFilter, title, imgSrc, alt, handleChangeFilter }: IInventoryFilterBtnProps) {

    return (
        <Button
            variant={isActiveFilter ? "blue" : "gray"}
            className={'col-span-2 flex h-16 w-full flex-row items-center gap-2.5'}
            onClick={() => handleChangeFilter()}
        >
            {imgSrc ? <Image
                src={imgSrc}
                width={32}
                height={28}
                alt={alt ? alt : title}
                className="h-7 w-8 object-contain object-center"
                />
            : <SmBtn className="-z-1 absolute inset-0 size-full" />}
            <span className="font-pixel text-main-gray text-lg font-bold">
                {title}
            </span>
        </Button>
    )
}