#pragma once
#include <iostream>
#include <string>
#include <stdint.h>

class CustomURLProtocol
{
private:
	std::wstring		m_wszProtocolName;
	std::wstring		m_wszAppPath;

	DWORD				m_dwErrorCode;
	std::wstring		m_wszErrorMsg;

	void				FormatErrorMsg();

public:

	std::wstring getProtocolName() const { return m_wszProtocolName; }
	std::wstring getAppPath() const { return m_wszAppPath; }
	std::wstring getErrorMsg() const { return m_wszErrorMsg; };

	void setProtocolName(std::wstring pwProtocolName) { m_wszProtocolName = pwProtocolName; }
	void setAppPath(std::wstring pwAppPath) { m_wszAppPath = pwAppPath; }

	CustomURLProtocol();
	CustomURLProtocol(std::wstring pwProtocolName, std::wstring pwCompanyName, std::wstring pwAppPath);

	bool CreateCustomProtocol();
	bool DeleteCustomProtocol();

	std::wstring GetHtmlString();
};
