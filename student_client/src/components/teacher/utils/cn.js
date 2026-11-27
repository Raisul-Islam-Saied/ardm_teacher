import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Tailwind ক্লাসগুলোকে কোনো কনফ্লিক্ট ছাড়া মার্জ করার ইউটিলিটি
 */
export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

export default cn;
