
#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <assert.h>
#include <memory>
#include <exception>

#include <chrono>
#include <future>
#include <cstdlib>
#include "logger.h"

#define js_throw_error(func, msg)   throw std::runtime_error(msg)

void jslog(const char* pos, int line, const char* fmt, ...)
{
    char buffer[4096];
    int n = std::snprintf(buffer, sizeof(buffer), "[N] ");
    va_list args;
    va_start(args, fmt);
    n += std::vsnprintf(buffer + n, sizeof(buffer) - n - 1, fmt, args);
    va_end(args);

    if (pos)
    {
        std::snprintf(buffer + n, sizeof(buffer) - n - 1, " at %s:%d", pos, line);
    }

        LOGI0 << buffer;
}

using namespace std::chrono_literals;

class LLHook
{
public:
    LLHook() = default;
    ~LLHook()
    {
        FNSCOPE();
        if (loopThreadId)
            if (!::PostThreadMessageW(loopThreadId, WM_QUIT, 0, 0))
                LOGE << "PostThreadMessage";

        if (loopFuture.valid())
        {
            auto state = loopFuture.wait_for(5s);
            if (state == std::future_status::ready)
                loopFuture.get();
            else
            {
                const char *name[] = {"ready", "timeout", "deffered"};
                JSLOG("wait failed: %s", name[(int)state]);
            }
        }

        if (hKeyHook)
            if (!::UnhookWindowsHookEx(hKeyHook))
                LOGE << "UnhookWindowsHookEx";
    }
    void Pause(bool pause)
    {
        JSLOG("%s keybd monitor", pause ? "Pause" : "Resume");
        pauseMonitor = pause;
    }

    bool hook(HWND hWnd)
    {
        static LLHook *_this = nullptr;
        _this = this;

        Assert(hKeyHook == nullptr);
        HMODULE hInstance = ::GetModuleHandleA(TOSTR(NODE_GYP_MODULE_NAME) ".node");
        if (!hInstance)
            LOGE << "GetModuleHandlA";

        hKeyHook = ::SetWindowsHookExW(
            WH_KEYBOARD_LL, [](int nCode, WPARAM wParam, LPARAM lParam) -> LRESULT {
                return _this->LLKeyboardProc(nCode, wParam, lParam);
            },
            hInstance, 0);

        if (!hKeyHook)
        {
            js_throw_error(__FUNCTION__, fmt::csprintf("keyhook failed: errno=%d", GetLastError()));
            return false;
        }

        hTargetWnd = hWnd;
        loopFuture = std::async(std::launch::async, [this] {
            klog::FnScope("native-thread:loopFuture");
            loopThreadId = ::GetCurrentThreadId();
            for (MSG msg; GetMessageW(&msg, nullptr, 0, 0) > 0;)
                ;
            return 0;
        });

        if (!loopFuture.valid())
        {
            LOGE << "invalid loopFuture";
            return false;
        }
        return true;
    }

private:
    LRESULT LLKeyboardProc(int nCode, WPARAM wParam, LPARAM lParam)
    {
        LOGI << __FUNCTION__;
        if (nCode == HC_ACTION && pauseMonitor == false)
        {
            switch (wParam)
            {
            case WM_SYSKEYDOWN:
            case WM_SYSKEYUP:
            case WM_KEYDOWN:
            case WM_KEYUP:
                const auto kbdll = (KBDLLHOOKSTRUCT *)lParam;
                switch (kbdll->vkCode)
                {
                case VK_SNAPSHOT: // PrtSc/SysRq
                case VK_LWIN:
                case VK_RWIN:
                case VK_LMENU:
                case VK_RMENU:
                case VK_LCONTROL:
                case VK_RCONTROL:
                    if (isDev)
                        LOGI << fmt::csprintf("msg=%04X, key.%x block %s", wParam, kbdll->vkCode, ((wParam & 1) ? "UP" : "DOWN"));

                    const bool keyup = !!(wParam & 1);
                    const bool extended = (kbdll->flags & LLKHF_EXTENDED);
                    lParam = (1 << 30) | ((kbdll->scanCode & 0xff) << 16) | 1;
                    if (keyup)
                        lParam |= 1 << 31;
                    if (extended)
                        lParam |= 1 << 24;
                    if (wParam >= WM_SYSKEYDOWN)
                    {
                        const bool altDown = (kbdll->flags & LLKHF_ALTDOWN);
                        if (altDown)
                            lParam |= 1 << 29;
                    }

                    if (!IsWindow(hTargetWnd))
                    {
                        LOGI << fmt::csprintf("hwnd.%p is not a window", hTargetWnd);
                        break;
                    }

                    if (!::PostMessageW(hTargetWnd, wParam, kbdll->vkCode, lParam))
                        LOGE << "PostMessageW";
                    return TRUE;
                }
            }
        }
        return ::CallNextHookEx(NULL, nCode, wParam, lParam);
    }

    std::future<int> loopFuture;
    uint32_t loopThreadId = 0;
    bool pauseMonitor = false;
    HWND hTargetWnd = nullptr;
    HHOOK hKeyHook = nullptr;
};

static std::unique_ptr<LLHook> _keybdMonitor;
bool startKeybdMonitor(int64_t hwndNumber)
{
    FNSCOPE();
    HWND hTargetWnd = (HWND)hwndNumber;
    if (!::IsWindow(hTargetWnd))
    {
        js_throw_error(__FUNCTION__, fmt::csprintf("invalid window handle: %p", hTargetWnd));
        return false;
    }

    _keybdMonitor.reset();
    _keybdMonitor = std::make_unique<LLHook>();
    if (!_keybdMonitor->hook(hTargetWnd))
    {
        js_throw_error(__FUNCTION__, fmt::csprintf("setup failed : errno=%d", GetLastError()));
        _keybdMonitor.reset();
        return false;
    }

    JSLOG("setup(hwnd.%p) ok", hTargetWnd);
    return true;
}

bool stopKeybdMonitor()
{
    FNSCOPE();
    if (_keybdMonitor)
    {
        _keybdMonitor.reset();
        return true;
    }

    JSLOG("No keybd monitor object");
    return false;
}

bool pauseResumeKeybdMonitor(bool pause)
{
    if (_keybdMonitor)
    {

        _keybdMonitor->Pause(pause);
        return true;
    }

    JSLOG("No keybd monitor object");
    return false;
}

// BOOL WINAPI DllMain(
//     __in HINSTANCE hDllHandle,
//     __in DWORD fdwReason,
//     __in LPVOID lpvReserved)
// {
//     switch (fdwReason)
//     {
//     case DLL_PROCESS_ATTACH:
//             DisableThreadLibraryCalls(hDllHandle);
//     case DLL_PROCESS_DETACH:
//             LOGI << "reason=" << fdwReason;
//             break;

//     case DLL_THREAD_ATTACH:
//     case DLL_THREAD_DETACH:
//             LOGD << "reason=" << fdwReason;
//             break;
//     }
//     return TRUE;
// }
