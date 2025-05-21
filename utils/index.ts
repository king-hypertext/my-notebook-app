export const truncateText = (text: string, maxLength: number = 45) => {
	if (text && text.length > maxLength) {
		return text.substring(0, maxLength) + "...";
	}
	return text;
};

export const toSingleLine = (text: string) => {
	return text.replace(/[\r\n]+/g, " ");
};
