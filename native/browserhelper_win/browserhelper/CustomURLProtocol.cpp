// CustomURLProtocol.cpp : Defines the class behaviors for the application.
//

#include "pch.h"
#include "CustomURLProtocol.h"
#include <Strsafe.h>
#include "logger.h"




#define URL_PROTOCOL_STRING			L"URL:%s"
#define URL_PROTOCOL				L"URL Protocol"
#define URL_PROTOCOL_DEFAULTICON	L"DefaultIcon"
#define URL_PROTOCOL_COMMAND		L"Shell\\Open\\command"
#define URL_PROTOCOL_OPEN			L"Shell\\Open"
#define URL_PROTOCOL_SHELL			L"Shell"


CustomURLProtocol::CustomURLProtocol()
{
	m_wszProtocolName = L"CustomProtocol";
	m_wszAppPath = L"Notepad.exe";
}

CustomURLProtocol::CustomURLProtocol(std::wstring pwProtocolName, std::wstring pwCompanyName, std::wstring pwAppPath)
{
	m_wszProtocolName = pwProtocolName;
	m_wszAppPath = pwAppPath;
}

void CustomURLProtocol::FormatErrorMsg()
{
	LPVOID lpMsgBuf;
	LPVOID lpDisplayBuf;

	FormatMessageW(FORMAT_MESSAGE_ALLOCATE_BUFFER |
		FORMAT_MESSAGE_FROM_SYSTEM |
		FORMAT_MESSAGE_IGNORE_INSERTS,
		NULL,
		m_dwErrorCode,
		MAKELANGID(LANG_NEUTRAL, SUBLANG_DEFAULT),
		(LPTSTR)&lpMsgBuf,
		0, NULL);

	// Display the error message and exit the process
	lpDisplayBuf = (LPVOID)LocalAlloc(LMEM_ZEROINIT, (lstrlenW((LPCTSTR)lpMsgBuf) + 40) * sizeof(TCHAR));

	StringCchPrintfW((LPTSTR)lpDisplayBuf,
		LocalSize(lpDisplayBuf) / sizeof(TCHAR),
		L"CustomURLProtocol::Failed with error %d: %s",
		m_dwErrorCode, lpMsgBuf);

	m_wszErrorMsg.append((LPCTSTR)lpDisplayBuf);
	OutputDebugStringW((LPCTSTR)lpDisplayBuf);

	LocalFree(lpMsgBuf);
	LocalFree(lpDisplayBuf);
}

static const auto HKEYROOT = HKEY_CURRENT_USER; // HKEY_CLASSES_ROOT

bool CustomURLProtocol::CreateCustomProtocol()
{
	WCHAR szValue[MAX_PATH] = { 0 };
	HKEY hKey = NULL;
	HKEY hKeyDefaultIcon = NULL;
	HKEY hKeyCommand = NULL;
	bool IsRegAlreadyPresent = false;

	do
	{
		std::wstring keypath = L"Software\\Classes\\" + m_wszProtocolName;
		if (RegOpenKeyExW(HKEYROOT, keypath.c_str(), 0L, KEY_READ, &hKey) != ERROR_SUCCESS)
		{
			auto code = RegCreateKeyExW(HKEYROOT,
				keypath.c_str(),
				0,
				NULL,
				REG_OPTION_NON_VOLATILE,
				KEY_ALL_ACCESS,
				NULL,
				&hKey,
				NULL);

			if (code != ERROR_SUCCESS) {
				LOGE << "code=" << code;
				break;
			}

			swprintf_s(szValue, MAX_PATH, URL_PROTOCOL_STRING, m_wszProtocolName.c_str());

			code = RegSetValueExW(hKey, L"", 0, REG_SZ, (BYTE*)&szValue, wcslen(szValue) * 2 + 2);
			if (code != ERROR_SUCCESS) {
				LOGE << "code=" << code;
				break;
			}

			code = RegSetValueExW(hKey, URL_PROTOCOL, 0, REG_SZ, (BYTE*)"", sizeof(REG_SZ));
			if (code != ERROR_SUCCESS) {
				LOGE << "code=" << code;
				break;
			}

			code = RegCreateKeyW(hKey, URL_PROTOCOL_DEFAULTICON, &hKeyDefaultIcon);
			if (code != ERROR_SUCCESS) {
				LOGE << "code=" << code;
				break;
			}

			swprintf_s(szValue, MAX_PATH, L"%s", m_wszAppPath.c_str());
			code = RegSetValueExW(hKeyDefaultIcon, L"", 0, REG_SZ, (BYTE*)&szValue, wcslen(szValue) * 2 + 2);
			if (code != ERROR_SUCCESS) {
				LOGE << "code=" << code;
				break;
			}

			code = RegCreateKeyW(hKey, URL_PROTOCOL_COMMAND, &hKeyCommand);
			if (code != ERROR_SUCCESS) {
				LOGE << "code=" << code;
				break;
			}

			swprintf_s(szValue, MAX_PATH, L"\"%s\" \"%%1\"", m_wszAppPath.c_str());
			code = RegSetValueExW(hKeyCommand, L"", 0, REG_SZ, (BYTE*)&szValue, wcslen(szValue) * 2 + 2);
			if (code != ERROR_SUCCESS) {
				LOGE << "code=" << code;
				break;
			}
			IsRegAlreadyPresent = true;
		}
		else
		{
			IsRegAlreadyPresent = true;
			LOGE << "The Key is already present.";
		}
	} while (FALSE);


	if (hKeyCommand)
		::RegCloseKey(hKeyCommand);
	if (hKeyDefaultIcon)
		::RegCloseKey(hKeyDefaultIcon);
	if (hKey)
		::RegCloseKey(hKey);

	return IsRegAlreadyPresent;
}



bool CustomURLProtocol::DeleteCustomProtocol()
{
	HKEY hKey = NULL;

	std::wstring keypath = L"Software\\Classes\\" + m_wszProtocolName;
	if ((m_dwErrorCode = RegOpenKeyExW(HKEYROOT, keypath.c_str(), 0L, KEY_ALL_ACCESS, &hKey)) == ERROR_SUCCESS)
	{
		if (m_dwErrorCode = ::RegDeleteKeyW(hKey, URL_PROTOCOL_DEFAULTICON) == ERROR_SUCCESS)
			if (m_dwErrorCode = ::RegDeleteKeyW(hKey, URL_PROTOCOL_COMMAND) == ERROR_SUCCESS)
				if (m_dwErrorCode = ::RegDeleteKeyW(hKey, URL_PROTOCOL_OPEN) == ERROR_SUCCESS)
					if (m_dwErrorCode = ::RegDeleteKeyW(hKey, URL_PROTOCOL_SHELL) == ERROR_SUCCESS)
						if (m_dwErrorCode = ::RegCloseKey(hKey) == ERROR_SUCCESS)
							m_dwErrorCode = ::RegDeleteKeyW(HKEYROOT, keypath.c_str());
	}
	if (m_dwErrorCode != ERROR_SUCCESS)
		FormatErrorMsg();
	return m_dwErrorCode == ERROR_SUCCESS;
}








std::wstring CustomURLProtocol::GetHtmlString()
{
	std::wstring str(L"<html xmlns=\"http://www.w3.org/1999/xhtml\"><head><title>Launch Custom URL \
</title><script type=\"text/javascript\">function LaunchURLScript(){var url = \"");

	str.append(this->getProtocolName());
	str.append(L":\";window.open(url);self.focus();}</script></head><body  style= \"background-color:#D7D7D7\">	\
<input type=\"submit\" name=\"Launch\" id=\"Launch\" value=\"Launch Custom URL\" onClick=\"LaunchURLScript()\"  />	\
</body></html>");


	return str;
	////Get Temp Path
	//WCHAR TempPath[MAX_PATH];
	//GetTempPathW(MAX_PATH, TempPath);
	//wcscat_s(TempPath, MAX_PATH, L"\\Test.html");

	//std::string str1 = WStringToString(str);
	//CFile cFile(TempPath, CFile::modeCreate | CFile::modeReadWrite);
	//cFile.Write(str1.c_str(), str1.length());
	//cFile.Close();
	//return TempPath;
}
//
//EXPORT void CreateCustomProtocol(const wchar_t* protocol, const wchar_t* company, const wchar_t* app_path) {
//
//	CustomURLProtocol cp(protocol, company, app_path);
//	cp.CreateCustomProtocol();
//	auto html = cp.GetHtmlString();
//	OutputDebugStringW(html.c_str());
//
//}